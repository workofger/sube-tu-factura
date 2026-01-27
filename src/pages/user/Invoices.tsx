import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
      pending_review: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'En revisión' },
      approved: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Aprobada' },
      pending_payment: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Por pagar' },
      paid: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Pagada' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Rechazada' },
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
        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
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
        <h1 className="text-2xl font-bold text-white mb-2">Mis Facturas</h1>
        <p className="text-slate-400">Consulta el estado de todas tus facturas</p>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-sm">Total Facturas</p>
            <p className="text-xl font-bold text-white">{data.total}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-sm">Total Facturado</p>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(data.summary.total_facturado)}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-sm">Pendiente</p>
            <p className="text-xl font-bold text-amber-400">
              {formatCurrency(data.summary.total_pendiente)}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
            <p className="text-slate-400 text-sm">Pagado</p>
            <p className="text-xl font-bold text-blue-400">
              {formatCurrency(data.summary.total_pagado)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por UUID, folio, proyecto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
            className="px-3 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value={currentYear}>{currentYear}</option>
            <option value={currentYear - 1}>{currentYear - 1}</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : !filteredInvoices || filteredInvoices.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500">No se encontraron facturas</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">
                      Factura
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">
                      Fecha
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">
                      Proyecto
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">
                      Semana
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-400">
                      Monto
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-slate-400">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {invoice.folio || invoice.uuid.substring(0, 8)}
                            </p>
                            <p className="text-slate-500 text-xs font-mono">
                              {invoice.uuid.substring(0, 20)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          {new Date(invoice.invoice_date).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">
                          {invoice.project_name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-400">
                          Sem {invoice.payment_week}/{invoice.payment_year}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div>
                          <p className="text-white font-semibold">
                            {formatCurrency(invoice.net_payment_amount || invoice.total_amount)}
                          </p>
                          {invoice.payment_program === 'pronto_pago' && invoice.pronto_pago_fee_amount && (
                            <p className="text-slate-500 text-xs">
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

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
                <p className="text-slate-400 text-sm">
                  Mostrando {filteredInvoices?.length || 0} de {data.total} facturas
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  </button>
                  <span className="text-slate-400">
                    {page} / {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page === data.totalPages}
                    className="p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-400" />
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
