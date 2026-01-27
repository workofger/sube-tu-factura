import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Zap, 
  Clock,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AdminLayout from '../../components/admin/AdminLayout';
import { getStats, DashboardStats, RecentInvoice } from '../../services/adminService';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await getStats();
    
    if (result.success && result.stats) {
      setStats(result.stats);
      setRecentInvoices(result.recentInvoices || []);
    } else {
      setError(result.message);
    }
    
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_review: 'bg-yellow-500/20 text-yellow-300',
      approved: 'bg-emerald-500/20 text-emerald-300',
      rejected: 'bg-red-500/20 text-red-300',
      paid: 'bg-blue-500/20 text-blue-300',
    };
    const labels: Record<string, string> = {
      pending_review: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      paid: 'Pagada',
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || 'bg-slate-500/20 text-slate-300'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              Reintentar
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const weekChange = stats ? stats.thisWeekInvoices - stats.lastWeekInvoices : 0;
  const weekChangePercent = stats && stats.lastWeekInvoices > 0 
    ? ((weekChange / stats.lastWeekInvoices) * 100).toFixed(1)
    : '0';

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="w-4 h-4" />
          <span>Semana {stats?.currentWeek || '-'} - {format(new Date(), "MMMM yyyy", { locale: es })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Invoices */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div className={`flex items-center gap-1 text-sm ${weekChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {weekChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{Math.abs(Number(weekChangePercent))}%</span>
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Total Facturas</p>
          <p className="text-3xl font-bold text-white">{stats?.totalInvoices || 0}</p>
          <p className="text-slate-500 text-xs mt-2">
            {stats?.thisWeekInvoices || 0} esta semana
          </p>
        </div>

        {/* Total Amount */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-slate-400 text-sm mb-1">Monto Total</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats?.totalAmount || 0)}</p>
          <p className="text-slate-500 text-xs mt-2">
            Facturas procesadas
          </p>
        </div>

        {/* Pronto Pago */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Pronto Pago</p>
          <p className="text-3xl font-bold text-white">{stats?.totalProntoPago || 0}</p>
          <p className="text-amber-400 text-xs mt-2">
            Fees: {formatCurrency(stats?.prontoPagoFees || 0)}
          </p>
        </div>

        {/* Standard */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-slate-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
          </div>
          <p className="text-slate-400 text-sm mb-1">Pago Estándar</p>
          <p className="text-3xl font-bold text-white">{stats?.totalStandard || 0}</p>
          <p className="text-slate-500 text-xs mt-2">
            {formatCurrency(stats?.standardAmount || 0)}
          </p>
        </div>
      </div>

      {/* Distribution Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payment Program Distribution */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Distribución por Programa</h3>
          <div className="space-y-4">
            {/* Pronto Pago Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-300">Pronto Pago</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-semibold">{stats?.totalProntoPago || 0}</span>
                  <span className="text-slate-500 text-sm ml-2">
                    ({formatCurrency(stats?.prontoPagoAmount || 0)})
                  </span>
                </div>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${stats && stats.totalInvoices > 0 
                      ? ((stats.totalProntoPago || 0) / stats.totalInvoices) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Standard Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">Estándar</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-semibold">{stats?.totalStandard || 0}</span>
                  <span className="text-slate-500 text-sm ml-2">
                    ({formatCurrency(stats?.standardAmount || 0)})
                  </span>
                </div>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${stats && stats.totalInvoices > 0 
                      ? ((stats.totalStandard || 0) / stats.totalInvoices) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total facturas</span>
              <span className="text-white font-semibold">
                {(stats?.totalProntoPago || 0) + (stats?.totalStandard || 0)} / {stats?.totalInvoices || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Suma de montos</span>
              <span className="text-white font-semibold">
                {formatCurrency((stats?.prontoPagoAmount || 0) + (stats?.standardAmount || 0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Ingresos por Pronto Pago (fees)</span>
              <span className="text-emerald-400 font-semibold">
                {formatCurrency(stats?.prontoPagoFees || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Facturas Recientes</h3>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay facturas recientes</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      invoice.payment_program === 'pronto_pago' 
                        ? 'bg-amber-500/20' 
                        : 'bg-blue-500/20'
                    }`}>
                      {invoice.payment_program === 'pronto_pago' 
                        ? <Zap className="w-5 h-5 text-amber-400" />
                        : <Clock className="w-5 h-5 text-blue-400" />
                      }
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm truncate max-w-[150px]">
                        {invoice.issuer_name}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {format(new Date(invoice.created_at), 'dd MMM, HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
