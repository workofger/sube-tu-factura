import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Zap,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import UserLayout from '../../components/user/UserLayout';
import { getUserInvoices, InvoicesResponse } from '../../services/userService';

const UserInvoices: React.FC = () => {
  const [data, setData] = useState<InvoicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState<number>(currentYear);

  useEffect(() => {
    loadInvoices();
  }, [page, statusFilter, yearFilter]);

  const loadInvoices = async () => {
    setIsLoading(true);
    const result = await getUserInvoices({
      page,
      pageSize: 10,
      status: statusFilter || undefined,
      year: yearFilter || undefined,
    });
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

  const getProgramBadge = (program: string) => {
    if (program === 'pronto_pago') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">
          <Zap className="w-3 h-3" />
          Pronto Pago
        </span>
      );
    }
    return null;
  };

  const filteredInvoices = data?.invoices.filter((inv) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      inv.uuid.toLowerCase().includes(searchLower) ||
      inv.folio?.toLowerCase().includes(searchLower) ||
      inv.project_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <UserLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-partrunner-black mb-2">Mis Facturas</h1>
        <p className="text-gray-500">Consulta el estado de todas tus facturas</p>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-partrunner-gray-light p-4">
            <p className="text-gray-500 text-sm">Total Facturas</p>
            <p className="text-xl font-bold text-partrunner-black">{data.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-partrunner-gray-light p-4">
            <p className="text-gray-500 text-sm">Total Facturado</p>
            <p className="text-xl font-bold text-partrunner-yellow-accent">
              {formatCurrency(data.summary.total_facturado)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-partrunner-gray-light p-4">
            <p className="text-gray-500 text-sm">Pendiente</p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(data.summary.total_pendiente)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-partrunner-gray-light p-4">
            <p className="text-gray-500 text-sm">Pagado</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(data.summary.total_pagado)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-partrunner-gray-light p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por UUID, folio, proyecto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
            >
              <option value="">Todos los estados</option>
              <option value="pending_review">En revisión</option>
              <option value="approved">Aprobada</option>
              <option value="pending_payment">Por pagar</option>
              <option value="paid">Pagada</option>
              <option value="rejected">Rechazada</option>
            </select>
          </div>

          {/* Year Filter */}
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(parseInt(e.target.value, 10));
              setPage(1);
            }}
            className="px-3 py-2.5 bg-gray-50 border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
          >
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear - 1}>{currentYear - 1}</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-partrunner-gray-light overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-partrunner-yellow animate-spin" />
          </div>
        ) : !filteredInvoices || filteredInvoices.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No se encontraron facturas</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-partrunner-gray-light bg-gray-50">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">
                      Factura
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">
                      Fecha
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">
                      Proyecto
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">
                      Semana
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-500">
                      Monto
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-500">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className={`border-b border-partrunner-gray-light hover:bg-gray-50 transition-colors ${
                        invoice.is_late ? 'bg-orange-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            invoice.is_late 
                              ? 'bg-orange-100' 
                              : invoice.payment_program === 'pronto_pago'
                                ? 'bg-amber-100'
                                : 'bg-gray-100'
                          }`}>
                            {invoice.is_late ? (
                              <AlertTriangle className="w-5 h-5 text-orange-600" />
                            ) : invoice.payment_program === 'pronto_pago' ? (
                              <Zap className="w-5 h-5 text-amber-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-partrunner-black font-medium">
                                {invoice.folio || invoice.uuid.substring(0, 8)}
                              </p>
                              {invoice.is_late && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium">
                                  EXTEMP.
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-xs font-mono">
                              {invoice.uuid.substring(0, 20)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(invoice.invoice_date).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-partrunner-black">
                          {invoice.project_name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">
                          Sem {invoice.payment_week}/{invoice.payment_year}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div>
                          <p className="text-partrunner-black font-semibold">
                            {formatCurrency(invoice.net_payment_amount || invoice.total_amount)}
                          </p>
                          {invoice.payment_program === 'pronto_pago' && invoice.pronto_pago_fee_amount && (
                            <p className="text-gray-400 text-xs">
                              -{formatCurrency(invoice.pronto_pago_fee_amount)} fee
                            </p>
                          )}
                        </div>
                        {getProgramBadge(invoice.payment_program)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(invoice.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-partrunner-gray-light">
              {filteredInvoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className={`p-4 ${invoice.is_late ? 'bg-orange-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        invoice.is_late 
                          ? 'bg-orange-100' 
                          : invoice.payment_program === 'pronto_pago'
                            ? 'bg-amber-100'
                            : 'bg-gray-100'
                      }`}>
                        {invoice.is_late ? (
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        ) : invoice.payment_program === 'pronto_pago' ? (
                          <Zap className="w-5 h-5 text-amber-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-partrunner-black font-medium">
                            {invoice.folio || invoice.uuid.substring(0, 8)}
                          </p>
                          {invoice.is_late && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium">
                              EXTEMP.
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs">
                          {invoice.project_name || 'Sin proyecto'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Calendar className="w-4 h-4" />
                      {new Date(invoice.invoice_date).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                      })}
                      <span>•</span>
                      <Clock className="w-4 h-4" />
                      Sem {invoice.payment_week}
                    </div>
                    <p className="text-partrunner-black font-semibold">
                      {formatCurrency(invoice.net_payment_amount || invoice.total_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-partrunner-gray-light">
                <p className="text-gray-500 text-sm">
                  Mostrando {filteredInvoices?.length || 0} de {data.total} facturas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-partrunner-black font-medium">
                    {page} / {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page === data.totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  );
};

export default UserInvoices;
