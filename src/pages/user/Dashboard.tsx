import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Loader2,
  Calendar,
} from 'lucide-react';
import UserLayout from '../../components/user/UserLayout';
import { useUserAuthContext } from '../../contexts/UserAuthContext';
import { getUserInvoices, InvoicesResponse } from '../../services/userService';

const UserDashboard: React.FC = () => {
  const { user } = useUserAuthContext();
  const [data, setData] = useState<InvoicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const result = await getUserInvoices({ pageSize: 5 });
    if (result.success && result.data) {
      setData(result.data);
    }
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending_review: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'En revisión' },
      approved: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Aprobada' },
      pending_payment: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Por pagar' },
      paid: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Pagada' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rechazada' },
    };

    const style = styles[status] || styles.pending_review;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <UserLayout>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          ¡Hola, {user?.fiscal_name || user?.email?.split('@')[0] || 'Usuario'}! 👋
        </h1>
        <p className="text-slate-400">Aquí está el resumen de tus facturas</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-slate-400 text-sm mb-1">Total Facturado</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data?.summary.total_facturado || 0)}
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-amber-400 text-sm font-medium">
                  {data?.summary.count_pending || 0}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data?.summary.total_pendiente || 0)}
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-blue-400 text-sm font-medium">
                  {data?.summary.count_paid || 0}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-1">Pagadas</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(data?.summary.total_pagado || 0)}
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-1">Total Facturas</p>
              <p className="text-2xl font-bold text-white">{data?.total || 0}</p>
            </div>
          </div>

          {/* Bank Account Status */}
          {!user?.bank_clabe && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-amber-400 font-semibold mb-1">
                    Completa tu información bancaria
                  </h3>
                  <p className="text-amber-300/70 text-sm mb-3">
                    Para recibir tus pagos, necesitamos tu CLABE interbancaria.
                  </p>
                  <Link
                    to="/portal/profile"
                    className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-medium"
                  >
                    Completar información
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Recent Invoices */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50">
            <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Facturas Recientes</h2>
              <Link
                to="/portal/invoices"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center gap-1"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {data?.invoices && data.invoices.length > 0 ? (
              <div className="divide-y divide-slate-700/30">
                {data.invoices.map((invoice) => (
                  <div key={invoice.id} className="p-5 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {invoice.folio || invoice.uuid.substring(0, 8)}
                          </p>
                          <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Calendar className="w-3 h-3" />
                            {new Date(invoice.invoice_date).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {invoice.project_name && (
                              <>
                                <span>•</span>
                                <span>{invoice.project_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold mb-1">
                          {formatCurrency(invoice.net_payment_amount || invoice.total_amount)}
                        </p>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">No tienes facturas todavía</p>
              </div>
            )}
          </div>
        </>
      )}
    </UserLayout>
  );
};

export default UserDashboard;
