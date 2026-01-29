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
  Loader2,
  AlertTriangle,
  AlertCircle
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
      pending_review: 'bg-amber-100 text-amber-700 border-amber-200',
      approved: 'bg-partrunner-yellow/20 text-partrunner-yellow-accent border-partrunner-yellow/30',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      paid: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const labels: Record<string, string> = {
      pending_review: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      paid: 'Pagada',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-partrunner-yellow-accent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-partrunner-yellow text-partrunner-black font-medium rounded-lg hover:bg-partrunner-yellow-dark transition-colors"
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
        <h1 className="text-2xl font-bold text-partrunner-black mb-2">Dashboard</h1>
        <div className="flex items-center gap-2 text-partrunner-gray-dark">
          <Calendar className="w-4 h-4" />
          <span>Semana {stats?.currentWeek || '-'} - {format(new Date(), "MMMM yyyy", { locale: es })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Invoices */}
        <div className="bg-white rounded-xl border border-partrunner-gray-light p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div className={`flex items-center gap-1 text-sm ${weekChange >= 0 ? 'text-partrunner-yellow-accent' : 'text-red-500'}`}>
              {weekChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{Math.abs(Number(weekChangePercent))}%</span>
            </div>
          </div>
          <p className="text-partrunner-gray-dark text-sm mb-1">Total Facturas</p>
          <p className="text-3xl font-bold text-partrunner-black">{stats?.totalInvoices || 0}</p>
          <p className="text-partrunner-gray-dark/70 text-xs mt-2">
            {stats?.thisWeekInvoices || 0} esta semana
          </p>
        </div>

        {/* Total Amount */}
        <div className="bg-white rounded-xl border border-partrunner-gray-light p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-partrunner-yellow/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-partrunner-yellow-accent" />
            </div>
            <TrendingUp className="w-5 h-5 text-partrunner-yellow-accent" />
          </div>
          <p className="text-partrunner-gray-dark text-sm mb-1">Monto Total</p>
          <p className="text-2xl font-bold text-partrunner-black">{formatCurrency(stats?.totalAmount || 0)}</p>
          <p className="text-partrunner-gray-dark/70 text-xs mt-2">
            Facturas procesadas
          </p>
        </div>

        {/* Pronto Pago */}
        <div className="bg-white rounded-xl border border-partrunner-gray-light p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
          </div>
          <p className="text-partrunner-gray-dark text-sm mb-1">Pronto Pago</p>
          <p className="text-3xl font-bold text-partrunner-black">{stats?.totalProntoPago || 0}</p>
          <p className="text-partrunner-yellow-accent text-xs mt-2 font-medium">
            Fees: {formatCurrency(stats?.prontoPagoFees || 0)}
          </p>
        </div>

        {/* Standard */}
        <div className="bg-white rounded-xl border border-partrunner-gray-light p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-500" />
            </div>
          </div>
          <p className="text-partrunner-gray-dark text-sm mb-1">Pago Estándar</p>
          <p className="text-3xl font-bold text-partrunner-black">{stats?.totalStandard || 0}</p>
          <p className="text-partrunner-gray-dark/70 text-xs mt-2">
            {formatCurrency(stats?.standardAmount || 0)}
          </p>
        </div>
      </div>

      {/* Alerts Row */}
      {((stats?.totalLate || 0) > 0 || (stats?.needsProjectReview || 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Late Invoices Alert */}
          {(stats?.totalLate || 0) > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-orange-700 font-semibold">Facturas Extemporáneas</p>
                  <p className="text-orange-600/70 text-sm">
                    {stats?.totalLate} facturas fuera de tiempo
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{stats?.totalLate}</p>
                  <p className="text-orange-500 text-xs">
                    {formatCurrency(stats?.lateAmount || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Needs Review Alert */}
          {(stats?.needsProjectReview || 0) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-amber-700 font-semibold">Requieren Revisión</p>
                  <p className="text-amber-600/70 text-sm">
                    Proyecto no identificado automáticamente
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">{stats?.needsProjectReview}</p>
                  <p className="text-amber-500 text-xs">facturas pendientes</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Distribution Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payment Program Distribution */}
        <div className="bg-white rounded-xl border border-partrunner-gray-light p-6 shadow-card">
          <h3 className="text-lg font-semibold text-partrunner-black mb-6">Distribución por Programa</h3>
          <div className="space-y-4">
            {/* Pronto Pago Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-partrunner-gray-dark">Pronto Pago</span>
                </div>
                <div className="text-right">
                  <span className="text-partrunner-black font-semibold">{stats?.totalProntoPago || 0}</span>
                  <span className="text-partrunner-gray-dark/70 text-sm ml-2">
                    ({formatCurrency(stats?.prontoPagoAmount || 0)})
                  </span>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
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
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-partrunner-gray-dark">Estándar</span>
                </div>
                <div className="text-right">
                  <span className="text-partrunner-black font-semibold">{stats?.totalStandard || 0}</span>
                  <span className="text-partrunner-gray-dark/70 text-sm ml-2">
                    ({formatCurrency(stats?.standardAmount || 0)})
                  </span>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-500"
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
          <div className="mt-6 pt-6 border-t border-partrunner-gray-light space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-partrunner-gray-dark">Total facturas</span>
              <span className="text-partrunner-black font-semibold">
                {(stats?.totalProntoPago || 0) + (stats?.totalStandard || 0)} / {stats?.totalInvoices || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-partrunner-gray-dark">Suma de montos</span>
              <span className="text-partrunner-black font-semibold">
                {formatCurrency((stats?.prontoPagoAmount || 0) + (stats?.standardAmount || 0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-partrunner-gray-dark">Ingresos por Pronto Pago (fees)</span>
              <span className="text-partrunner-yellow-accent font-semibold">
                {formatCurrency(stats?.prontoPagoFees || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-partrunner-gray-light p-6 shadow-card">
          <h3 className="text-lg font-semibold text-partrunner-black mb-6">Facturas Recientes</h3>
          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <p className="text-partrunner-gray-dark/70 text-center py-8">No hay facturas recientes</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-card ${
                    invoice.is_late 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      invoice.is_late
                        ? 'bg-orange-100'
                        : invoice.payment_program === 'pronto_pago' 
                          ? 'bg-amber-100' 
                          : 'bg-blue-100'
                    }`}>
                      {invoice.is_late ? (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      ) : invoice.payment_program === 'pronto_pago' ? (
                        <Zap className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-partrunner-black font-medium text-sm truncate max-w-[140px]">
                          {invoice.issuer_name}
                        </p>
                        {invoice.is_late && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-orange-200 text-orange-700 rounded-full font-medium">
                            EXTEMP.
                          </span>
                        )}
                      </div>
                      <p className="text-partrunner-gray-dark/70 text-xs">
                        {format(new Date(invoice.created_at), 'dd MMM, HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-partrunner-black font-semibold text-sm">
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
