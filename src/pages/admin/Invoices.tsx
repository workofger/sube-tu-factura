import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText,
  Zap,
  Clock,
  Eye,
  X,
  Loader2,
  Building2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  getInvoices, 
  InvoiceListItem, 
  InvoiceFilters 
} from '../../services/adminService';

interface FilterState {
  search: string;
  week: string;
  project: string;
  paymentProgram: string;
  status: string;
  needsReview: boolean;
  isLate: boolean;
}

const ITEMS_PER_PAGE = 10;

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    week: '',
    project: '',
    paymentProgram: '',
    status: '',
    needsReview: false,
    isLate: false,
  });

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const apiFilters: InvoiceFilters = {
      page: currentPage,
      pageSize: ITEMS_PER_PAGE,
    };

    if (filters.search) apiFilters.search = filters.search;
    if (filters.week) apiFilters.week = parseInt(filters.week, 10);
    if (filters.project) apiFilters.project = filters.project;
    if (filters.paymentProgram) apiFilters.paymentProgram = filters.paymentProgram;
    if (filters.status) apiFilters.status = filters.status;
    if (filters.needsReview) apiFilters.needsReview = true;
    if (filters.isLate) apiFilters.isLate = true;

    const result = await getInvoices(apiFilters);

    if (result.success && result.data) {
      setInvoices(result.data.invoices);
      setTotalCount(result.data.total);
      setTotalPages(result.data.totalPages);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  }, [filters, currentPage]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_review: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
      paid: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    };
    const labels: Record<string, string> = {
      pending_review: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      paid: 'Pagada',
    };
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full border ${styles[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Generate week options
  const weekOptions = Array.from({ length: 53 }, (_, i) => i + 1);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturas</h1>
          <p className="text-slate-400 text-sm mt-1">
            {totalCount} facturas encontradas
          </p>
        </div>

        <button
          onClick={() => window.location.href = '/admin/reports'}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por UUID, RFC o nombre..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
              showFilters 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                : 'bg-slate-900/50 border-slate-600/50 text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filtros
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700/50">
              {/* Week Filter */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Semana</label>
                <select
                  value={filters.week}
                  onChange={(e) => setFilters(prev => ({ ...prev, week: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Todas</option>
                  {weekOptions.map(week => (
                    <option key={week} value={week}>Semana {week}</option>
                  ))}
                </select>
              </div>

              {/* Payment Program Filter */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Programa de Pago</label>
                <select
                  value={filters.paymentProgram}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentProgram: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Todos</option>
                  <option value="pronto_pago">Pronto Pago</option>
                  <option value="standard">Estándar</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Todos</option>
                  <option value="pending_review">Pendiente</option>
                  <option value="approved">Aprobada</option>
                  <option value="rejected">Rechazada</option>
                  <option value="paid">Pagada</option>
                </select>
              </div>
            </div>
            
            {/* Quick Filters Row */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700/30">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.needsReview}
                  onChange={(e) => setFilters(prev => ({ ...prev, needsReview: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                />
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 text-sm">Requiere revisión de proyecto</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isLate}
                  onChange={(e) => setFilters(prev => ({ ...prev, isLate: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 text-orange-500 focus:ring-orange-500"
                />
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-slate-300 text-sm">Extemporáneas</span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={fetchInvoices}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              Reintentar
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No se encontraron facturas</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Emisor</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Folio/UUID</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Proyecto</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Programa</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Monto</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Estado</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className={`border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors ${
                        invoice.is_late ? 'bg-orange-500/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-white font-medium truncate max-w-[180px]">
                              {invoice.issuer_name}
                            </p>
                            <p className="text-slate-500 text-sm">{invoice.issuer_rfc}</p>
                          </div>
                          {invoice.is_late && (
                            <span className="flex-shrink-0 flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              EXTEMP.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-mono text-sm">{invoice.folio || '-'}</p>
                          <p className="text-slate-500 text-xs truncate max-w-[150px]">
                            {invoice.uuid}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">
                            {invoice.project_name || '-'}
                          </span>
                          {invoice.needs_project_review && (
                            <span title="Requiere revisión de proyecto">
                              <AlertCircle className="w-4 h-4 text-amber-400" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {invoice.payment_program === 'pronto_pago' ? (
                            <>
                              <Zap className="w-4 h-4 text-amber-400" />
                              <span className="text-amber-300 text-sm">Pronto Pago</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-blue-400" />
                              <span className="text-blue-300 text-sm">Estándar</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-white font-semibold">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                        {invoice.payment_program === 'pronto_pago' && invoice.net_payment_amount && (
                          <p className="text-emerald-400 text-xs">
                            Neto: {formatCurrency(invoice.net_payment_amount)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-slate-700/30">
              {invoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className={`p-4 ${invoice.is_late ? 'bg-orange-500/5' : ''}`} 
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium">{invoice.issuer_name}</p>
                        {invoice.is_late && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            EXTEMP.
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">{invoice.issuer_rfc}</p>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {invoice.is_late ? (
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                      ) : invoice.payment_program === 'pronto_pago' ? (
                        <Zap className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-slate-400 text-sm">
                        S{invoice.payment_week}
                      </span>
                      {invoice.needs_project_review && (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <p className="text-white font-semibold">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
              <p className="text-slate-400 text-sm">
                Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-white px-4">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white">Detalle de Factura</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Issuer Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">{selectedInvoice.issuer_name}</h4>
                  <p className="text-slate-400">{selectedInvoice.issuer_rfc}</p>
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-500 text-sm mb-1">UUID</p>
                  <p className="text-white font-mono text-sm break-all">{selectedInvoice.uuid}</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-500 text-sm mb-1">Folio</p>
                  <p className="text-white">{selectedInvoice.folio || '-'}</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-500 text-sm mb-1">Fecha Factura</p>
                  <p className="text-white">
                    {format(new Date(selectedInvoice.invoice_date), 'dd MMMM yyyy', { locale: es })}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-500 text-sm mb-1">Semana de Pago</p>
                  <p className="text-white">Semana {selectedInvoice.payment_week}, {selectedInvoice.payment_year}</p>
                </div>
              </div>

              {/* Financial */}
              <div className="bg-slate-900/50 rounded-xl p-4">
                <h5 className="text-slate-400 text-sm mb-4">Información Financiera</h5>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Factura</span>
                    <span className="text-white font-semibold">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                  {selectedInvoice.payment_program === 'pronto_pago' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Costo Financiero (8%)</span>
                        <span className="text-red-400">-{formatCurrency(selectedInvoice.pronto_pago_fee_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-slate-700">
                        <span className="text-white font-medium">Monto Neto a Pagar</span>
                        <span className="text-emerald-400 font-bold">{formatCurrency(selectedInvoice.net_payment_amount || selectedInvoice.total_amount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Late Invoice Alert */}
              {selectedInvoice.is_late && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-orange-300 font-semibold">Factura Extemporánea</p>
                    <p className="text-orange-400/70 text-sm">
                      {selectedInvoice.late_reason === 'after_deadline' 
                        ? 'Subida después del plazo límite (Jueves 10 AM)'
                        : selectedInvoice.late_reason === 'wrong_invoice_date'
                        ? 'Fecha de factura fuera del período válido'
                        : selectedInvoice.late_reason === 'wrong_week_in_description'
                        ? 'Semana en descripción no coincide'
                        : 'Factura fuera de tiempo'}
                    </p>
                  </div>
                </div>
              )}

              {/* Needs Review Alert */}
              {selectedInvoice.needs_project_review && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-300 font-semibold">Requiere Revisión</p>
                    <p className="text-amber-400/70 text-sm">
                      Proyecto no identificado automáticamente - revisar manualmente
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Program Badge */}
              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                selectedInvoice.payment_program === 'pronto_pago'
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : 'bg-blue-500/10 border border-blue-500/30'
              }`}>
                {selectedInvoice.payment_program === 'pronto_pago' ? (
                  <>
                    <Zap className="w-6 h-6 text-amber-400" />
                    <div>
                      <p className="text-amber-300 font-semibold">Pronto Pago</p>
                      <p className="text-amber-400/70 text-sm">Pago en 1 día hábil</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="text-blue-300 font-semibold">Pago Estándar</p>
                      <p className="text-blue-400/70 text-sm">Pago la semana siguiente</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Invoices;
