import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/formatCurrency";

const Reports = () => {
  const [dateRange, setDateRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    totalExpenses: 0,
    profit: 0,
    avgOrderValue: 0,
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Get current user for multi-tenant
      const { data: sessionData } = await supabase.auth.getUser();
      const userId = sessionData?.user?.id;

      // Calculate date range
      const today = new Date();
      let startDate = new Date();

      if (dateRange === "week") {
        startDate.setDate(today.getDate() - 7);
      } else if (dateRange === "month") {
        startDate.setMonth(today.getMonth() - 1);
      } else if (dateRange === "year") {
        startDate.setFullYear(today.getFullYear() - 1);
      }

      const startDateStr = startDate.toISOString().split("T")[0];

      // Fetch transactions
      let txQuery = supabase
        .from("transactions")
        .select("*, transaction_items(*, products(*))")
        .gte("created_at", startDate.toISOString());

      if (userId) {
        txQuery = txQuery.eq("user_id", userId);
      }

      const { data: transactions, error: txError } = await txQuery;

      if (txError) throw txError;

      // Fetch expenses with date column and proper sorting
      let expQuery = supabase
        .from("expenses")
        .select("amount, date")
        .gte("date", startDateStr)
        .order("date", { ascending: false });

      if (userId) {
        expQuery = expQuery.eq("user_id", userId);
      }

      const { data: expenses, error: expError } = await expQuery;

      if (expError) throw expError;

      // Calculate totals
      const totalRevenue = (transactions || []).reduce(
        (sum, tx) => sum + Number(tx.total),
        0,
      );
      const totalTransactions = transactions?.length || 0;
      const totalExpenses = (expenses || []).reduce(
        (sum, exp) => sum + Number(exp.amount),
        0,
      );
      const profit = totalRevenue - totalExpenses;
      const avgOrderValue =
        totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      setSummary({
        totalRevenue,
        totalTransactions,
        totalExpenses,
        profit,
        avgOrderValue,
      });

      // Process sales over time (daily)
      const salesByDay = {};
      (transactions || []).forEach((tx) => {
        const date = new Date(tx.created_at).toISOString().split("T")[0];
        salesByDay[date] = (salesByDay[date] || 0) + Number(tx.total);
      });

      const salesArray = Object.entries(salesByDay)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setSalesData(salesArray);

      // Process top products
      const productSales = {};
      (transactions || []).forEach((tx) => {
        (tx.transaction_items || []).forEach((item) => {
          const name = item.product_name;
          productSales[name] =
            (productSales[name] || 0) + Number(item.subtotal);
        });
      });

      const topProductsArray = Object.entries(productSales)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setTopProducts(topProductsArray);

      // Process category data
      const categorySales = {};
      (transactions || []).forEach((tx) => {
        (tx.transaction_items || []).forEach((item) => {
          if (item.products?.categories?.name) {
            const cat = item.products.categories.name;
            categorySales[cat] =
              (categorySales[cat] || 0) + Number(item.subtotal);
          }
        });
      });

      const categoryArray = Object.entries(categorySales)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);
      setCategoryData(categoryArray);
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Reports</h1>
          <p className="text-sm text-dark-500 mt-1">
            Analytics and insights for your business
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-dark-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary-600/20 to-primary-800/20 border-primary-600/30">
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-dark-400">Total Revenue</p>
                <p className="text-lg font-bold text-primary-400">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-dark-400" />
              </div>
              <div>
                <p className="text-xs text-dark-400">Transactions</p>
                <p className="text-lg font-bold text-dark-100">
                  {summary.totalTransactions}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-600/30">
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-dark-400">Total Expenses</p>
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card
          className={`bg-gradient-to-br ${
            summary.profit >= 0
              ? "from-green-600/20 to-green-800/20 border-green-600/30"
              : "from-red-600/20 to-red-800/20 border-red-600/30"
          }`}
        >
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  summary.profit >= 0 ? "bg-green-600/20" : "bg-red-600/20"
                }`}
              >
                {summary.profit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-dark-400">Profit</p>
                <p
                  className={`text-lg font-bold ${
                    summary.profit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatCurrency(summary.profit)}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-dark-400" />
              </div>
              <div>
                <p className="text-xs text-dark-400">Avg. Order</p>
                <p className="text-lg font-bold text-dark-100">
                  {formatCurrency(summary.avgOrderValue)}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <Card.Header>
            <h3 className="font-semibold text-dark-100 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-400" />
              Revenue Over Time
            </h3>
          </Card.Header>
          <Card.Content>
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : salesData.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <BarChart3 className="h-12 w-12 text-dark-700 mb-3" />
                <p className="text-dark-500">No sales data available</p>
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("id-ID", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) =>
                        `Rp${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                      formatter={(value) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString("id-ID", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#10b981" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <Card.Header>
            <h3 className="font-semibold text-dark-100 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-400" />
              Top 5 Products
            </h3>
          </Card.Header>
          <Card.Content>
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <Package className="h-12 w-12 text-dark-700 mb-3" />
                <p className="text-dark-500">No product data available</p>
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      type="number"
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value) =>
                        `Rp${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={12}
                      width={100}
                      tickFormatter={(value) =>
                        value.length > 12
                          ? `${value.substring(0, 12)}...`
                          : value
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [formatCurrency(value), "Revenue"]}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <Card.Header>
          <h3 className="font-semibold text-dark-100 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-400" />
            Sales by Category
          </h3>
        </Card.Header>
        <Card.Content>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categoryData.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-12 w-12 text-dark-700 mb-3" />
              <p className="text-dark-500">No category data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="total"
                      nameKey="name"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [formatCurrency(value), "Revenue"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend */}
              <div className="space-y-3">
                {categoryData.map((cat, index) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="text-sm text-dark-200">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-dark-100">
                        {formatCurrency(cat.total)}
                      </p>
                      <p className="text-xs text-dark-500">
                        {summary.totalRevenue > 0
                          ? `${((cat.total / summary.totalRevenue) * 100).toFixed(1)}%`
                          : "0%"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default Reports;
