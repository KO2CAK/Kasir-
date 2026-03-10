import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  BarChart3,
  RefreshCw,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/generateTransactionNumber";
import { useVisibilityHandler } from "@/hooks/useVisibilityHandler";

const Dashboard = () => {
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    totalProducts: 0,
    lowStockCount: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Handle visibility change - refresh data when tab becomes visible
  useVisibilityHandler(() => {
    // Only refresh if not currently loading and component is mounted
    if (!loading && isMounted.current) {
      fetchDashboardData();
    }
  });

  useEffect(() => {
    // Set mounted to true on mount
    isMounted.current = true;

    fetchDashboardData();

    // Cleanup: set mounted to false on unmount to prevent state updates
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchDashboardData = async () => {
    // Prevent fetch if component is unmounted
    if (!isMounted.current) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get current user for multi-tenant
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      // Fetch today's transactions - let RLS handle visibility
      // Admin sees all, Cashier sees only their own
      const { data: todayTx, error: txError } = await supabase
        .from("transactions")
        .select("total")
        .gte("created_at", today.toISOString());

      if (txError) throw txError;

      const todaySales =
        todayTx?.reduce((sum, tx) => sum + Number(tx.total), 0) || 0;
      const todayTransactions = todayTx?.length || 0;

      // Fetch total active products - let RLS handle visibility
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Fetch low stock products (stock < 10) - let RLS handle visibility
      const { data: lowStock, count: lowStockCount } = await supabase
        .from("products")
        .select("id, name, sku, stock, price, categories(name)", {
          count: "exact",
        })
        .lt("stock", 10)
        .eq("is_active", true)
        .order("stock", { ascending: true })
        .limit(5);

      // Fetch recent transactions
      // Don't filter by user_id - let RLS handle visibility
      // RLS will return appropriate transactions based on user role
      let recentQuery = supabase
        .from("transactions")
        .select("*, profiles!transactions_cashier_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recent } = await recentQuery;

      // Fetch 7-day revenue data - let RLS handle visibility
      const { data: weekTx } = await supabase
        .from("transactions")
        .select("total, created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Build 7-day chart data
      const dayMap = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split("T")[0];
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const dateLabel = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        dayMap[key] = { day: dayName, date: dateLabel, revenue: 0, orders: 0 };
      }

      (weekTx || []).forEach((tx) => {
        const key = tx.created_at.split("T")[0];
        if (dayMap[key]) {
          dayMap[key].revenue += Number(tx.total);
          dayMap[key].orders += 1;
        }
      });

      // Fetch top selling products (last 30 days)
      // First get visible transactions (respects RLS), then get their items
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get transactions first - this respects RLS
      const { data: topTransactions } = await supabase
        .from("transactions")
        .select("id")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const transactionIds = (topTransactions || []).map((t) => t.id);

      // Then get items only for visible transactions
      let topItems = [];
      if (transactionIds.length > 0) {
        const { data: items } = await supabase
          .from("transaction_items")
          .select("product_id, product_name, quantity")
          .in("transaction_id", transactionIds);

        topItems = items || [];
      }

      // Aggregate top products
      const productMap = {};
      (topItems || []).forEach((item) => {
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = {
            product_name: item.product_name,
            total_sold: 0,
          };
        }
        productMap[item.product_id].total_sold += item.quantity;
      });

      const sortedTopProducts = Object.values(productMap)
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5);

      // Only update state if component is still mounted
      if (!isMounted.current) return;

      setRevenueData(Object.values(dayMap));
      setStats({
        todaySales,
        todayTransactions,
        totalProducts: totalProducts || 0,
        lowStockCount: lowStockCount || 0,
      });
      setRecentTransactions(recent || []);
      setLowStockProducts(lowStock || []);
      setTopProducts(sortedTopProducts);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const statCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(stats.todaySales),
      icon: DollarSign,
      bgColor: "bg-primary-600/10",
      iconColor: "text-primary-400",
      borderColor: "border-primary-600/20",
    },
    {
      title: "Transactions Today",
      value: stats.todayTransactions,
      icon: ShoppingCart,
      bgColor: "bg-blue-600/10",
      iconColor: "text-blue-400",
      borderColor: "border-blue-600/20",
    },
    {
      title: "Active Products",
      value: stats.totalProducts,
      icon: Package,
      bgColor: "bg-violet-600/10",
      iconColor: "text-violet-400",
      borderColor: "border-violet-600/20",
    },
    {
      title: "Low Stock Alerts",
      value: stats.lowStockCount,
      icon: AlertTriangle,
      bgColor: "bg-amber-600/10",
      iconColor: "text-amber-400",
      borderColor: "border-amber-600/20",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-dark-800 border border-dark-700 rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="h-3 w-24 bg-dark-700 rounded" />
                  <div className="h-7 w-32 bg-dark-700 rounded" />
                </div>
                <div className="h-11 w-11 bg-dark-700 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        {/* Skeleton table */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 animate-pulse">
          <div className="h-5 w-48 bg-dark-700 rounded mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-dark-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark-100">Overview</h2>
          <p className="text-sm text-dark-500 mt-0.5">
            Here&apos;s what&apos;s happening with your store today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            icon={ShoppingCart}
            onClick={() => navigate("/cashier")}
          >
            Open Cashier
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className={`border ${stat.borderColor} hover:shadow-lg hover:shadow-dark-950/50 transition-all duration-200`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-dark-400 font-medium">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-dark-100 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <Card.Header>
          <div>
            <Card.Title>Revenue Overview</Card.Title>
            <Card.Description>Last 7 days performance</Card.Description>
          </div>
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <Calendar className="h-4 w-4" />
            <span>
              {revenueData.length > 0
                ? `${revenueData[0]?.date} — ${revenueData[revenueData.length - 1]?.date}`
                : "Loading..."}
            </span>
          </div>
        </Card.Header>
        <Card.Content>
          {revenueData.length === 0 ||
          revenueData.every((d) => d.revenue === 0) ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-dark-700 mx-auto mb-3" />
              <p className="text-dark-500 text-sm">No revenue data yet</p>
              <p className="text-dark-600 text-xs mt-1">
                Revenue chart will appear once you start making sales
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000)
                        return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                      return value;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                    }}
                    labelStyle={{ color: "#94a3b8", fontSize: 12 }}
                    formatter={(value, name) => {
                      if (name === "revenue")
                        return [formatCurrency(value), "Revenue"];
                      return [value, "Orders"];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) return payload[0].payload.date;
                      return label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                    activeDot={{
                      fill: "#10b981",
                      strokeWidth: 2,
                      r: 6,
                      stroke: "#fff",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue Summary Row */}
          {revenueData.some((d) => d.revenue > 0) && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-dark-700">
              <div className="text-center">
                <p className="text-xs text-dark-500">Total Revenue</p>
                <p className="text-sm font-bold text-primary-400 mt-0.5">
                  {formatCurrency(
                    revenueData.reduce((sum, d) => sum + d.revenue, 0),
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-dark-500">Total Orders</p>
                <p className="text-sm font-bold text-blue-400 mt-0.5">
                  {revenueData.reduce((sum, d) => sum + d.orders, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-dark-500">Avg / Day</p>
                <p className="text-sm font-bold text-violet-400 mt-0.5">
                  {formatCurrency(
                    revenueData.reduce((sum, d) => sum + d.revenue, 0) / 7,
                  )}
                </p>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header>
              <div>
                <Card.Title>Recent Transactions</Card.Title>
                <Card.Description>Latest 5 transactions</Card.Description>
              </div>
              <button
                onClick={() => navigate("/transactions")}
                className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </button>
            </Card.Header>
            <Card.Content>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-dark-700 mx-auto mb-3" />
                  <p className="text-dark-500 text-sm">No transactions yet</p>
                  <p className="text-dark-600 text-xs mt-1">
                    Start making sales from the Cashier page
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate("/cashier")}
                  >
                    Go to Cashier
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                          Transaction
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                          Cashier
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800">
                      {recentTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="hover:bg-dark-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-mono text-primary-400">
                              {tx.transaction_number}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-dark-300">
                              {tx.profiles?.full_name || "Unknown"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-700 text-dark-300 capitalize">
                              {tx.payment_method}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold text-primary-400">
                              {formatCurrency(tx.total)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-xs text-dark-500">
                              {formatDate(tx.created_at)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Top Selling Products */}
          <Card>
            <Card.Header>
              <div>
                <Card.Title className="text-base">Top Products</Card.Title>
                <Card.Description>Last 30 days</Card.Description>
              </div>
              <BarChart3 className="h-5 w-5 text-dark-500" />
            </Card.Header>
            <Card.Content>
              {topProducts.length === 0 ? (
                <div className="text-center py-6">
                  <TrendingUp className="h-8 w-8 text-dark-700 mx-auto mb-2" />
                  <p className="text-dark-500 text-xs">No sales data yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`
                            flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${
                              index === 0
                                ? "bg-primary-600/20 text-primary-400"
                                : index === 1
                                  ? "bg-blue-600/20 text-blue-400"
                                  : index === 2
                                    ? "bg-amber-600/20 text-amber-400"
                                    : "bg-dark-700 text-dark-400"
                            }
                          `}
                        >
                          {index + 1}
                        </span>
                        <span className="text-sm text-dark-300 truncate">
                          {product.product_name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-dark-200 flex-shrink-0">
                        {product.total_sold} sold
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Low Stock Alert */}
          <Card
            className={lowStockProducts.length > 0 ? "border-amber-600/20" : ""}
          >
            <Card.Header>
              <div>
                <Card.Title className="text-base">Low Stock</Card.Title>
                <Card.Description>Products below 10 units</Card.Description>
              </div>
              <AlertTriangle
                className={`h-5 w-5 ${
                  lowStockProducts.length > 0
                    ? "text-amber-400"
                    : "text-dark-500"
                }`}
              />
            </Card.Header>
            <Card.Content>
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="h-8 w-8 text-dark-700 mx-auto mb-2" />
                  <p className="text-dark-500 text-xs">
                    All products are well stocked
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-dark-300 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-dark-500">
                          {product.categories?.name || "Uncategorized"}
                        </p>
                      </div>
                      <span
                        className={`
                          flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
                          ${
                            product.stock === 0
                              ? "bg-red-600/10 text-red-400"
                              : product.stock < 5
                                ? "bg-amber-600/10 text-amber-400"
                                : "bg-yellow-600/10 text-yellow-400"
                          }
                        `}
                      >
                        {product.stock === 0
                          ? "Out of stock"
                          : `${product.stock} left`}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate("/inventory")}
                    className="w-full flex items-center justify-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors pt-2 border-t border-dark-700"
                  >
                    Manage Inventory
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
