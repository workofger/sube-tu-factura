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
  Zap,
  Upload,
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
      pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En revisión' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Aprobada' },
      pending_payment: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Por pagar' },
      paid: { bg: 'bg-partrunner-yellow/20', text: 'text-partrunner-yellow-accent', label: 'Pagada' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazada' },
    };

    const style = styles[status] || styles.pending_review;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <UserLayout>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-partrunner-black mb-2">
          ¡Hola, {user?.fiscal_name || user?.email?.split('@')[0] || 'Usuario'}!
        </h1>
        <p className="text-gray-500">Aquí está el resumen de tus facturas</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-partrunner-yellow animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-partrunner-gray-light p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-partrunner-yellow/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-partrunner-yellow-accent" />
                </div>
                <TrendingUp className="w-5 h-5 text-partrunner-yellow-accent" />
              </div>
              <p className="text-gray-500 text-sm mb-1">Total Facturado</p>
              <p className="text-2xl font-bold text-partrunner-black">
                {formatCurrency(data?.summary.total_facturado || 0)}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-partrunner-gray-light p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-amber-600 text-sm font-semibold">
                  {data?.summary.count_pending || 0}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-1">Pendientes</p>
              <p className="text-2xl font-bold text-partrunner-black">
                {formatCurrency(data?.summary.total_pendiente || 0)}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-partrunner-gray-light p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-blue-600 text-sm font-semibold">
                  {data?.summary.count_paid || 0}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-1">Pagadas</p>
              <p className="text-2xl font-bold text-partrunner-black">
                {formatCurrency(data?.summary.total_pagado || 0)}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-partrunner-gray-light p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-gray-500 text-sm mb-1">Total Facturas</p>
              <p className="text-2xl font-bold text-partrunner-black">{data?.total || 0}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Upload Invoice CTA */}
            <Link 
              to="/"
              className="bg-partrunner-yellow/10 hover:bg-partrunner-yellow/20 border border-partrunner-yellow/30 rounded-2xl p-5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-partrunner-yellow rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-partrunner-black" />
                </div>
                <div className="flex-1">
                  <h3 className="text-partrunner-black font-semibold mb-1">
                    Subir Nueva Factura
                  </h3>
                  <p className="text-partrunner-black/60 text-sm">
                    Carga tu XML y PDF para procesamiento automático
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-partrunner-yellow-accent group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Bank Account Status */}
            {!user?.bank_clabe ? (
              <Link 
                to="/portal/profile"
                className="bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-amber-800 font-semibold mb-1">
                      Completa tu información bancaria
                    </h3>
                    <p className="text-amber-700/70 text-sm">
                      Necesitamos tu CLABE para procesar tus pagos
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ) : (
              <div className="bg-partrunner-yellow/10 border border-partrunner-yellow/30 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-partrunner-yellow/30 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-partrunner-yellow-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-partrunner-black font-semibold mb-1">
                      Información bancaria completa
                    </h3>
                    <p className="text-partrunner-black/70 text-sm">
                      Tu cuenta está lista para recibir pagos
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-2xl border border-partrunner-gray-light overflow-hidden">
            <div className="p-5 border-b border-partrunner-gray-light flex items-center justify-between">
              <h2 className="text-lg font-semibold text-partrunner-black">Facturas Recientes</h2>
              <Link
                to="/portal/invoices"
                className="text-partrunner-yellow-accent hover:text-partrunner-yellow-dark text-sm font-medium flex items-center gap-1"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {data?.invoices && data.invoices.length > 0 ? (
              <div className="divide-y divide-partrunner-gray-light">
                {data.invoices.map((invoice) => (
                  <div key={invoice.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          invoice.payment_program === 'pronto_pago' 
                            ? 'bg-amber-100' 
                            : 'bg-gray-100'
                        }`}>
                          {invoice.payment_program === 'pronto_pago' ? (
                            <Zap className="w-5 h-5 text-amber-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-partrunner-black font-medium">
                            {invoice.folio || invoice.uuid.substring(0, 8)}
                          </p>
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
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
                        <p className="text-partrunner-black font-semibold mb-1">
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
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">No tienes facturas todavía</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-partrunner-yellow text-partrunner-black rounded-xl font-medium hover:bg-partrunner-yellow-dark transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Subir mi primera factura
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </UserLayout>
  );
};

export default UserDashboard;
