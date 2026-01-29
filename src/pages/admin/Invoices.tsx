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
      pending_review: 'bg-amber-100 text-amber-700 border-amber-200',
      approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
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
      <span className={`text-xs px-2.5 py-1 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
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
          <h1 className="text-2xl font-bold text-partrunner-black">Facturas</h1>
          <p className="text-partrunner-gray-dark text-sm mt-1">
            {totalCount} facturas encontradas
          </p>
        </div>

        <button
          onClick={() => window.location.href = '/admin/reports'}
          className="flex items-center gap-2 px-4 py-2.5 bg-partrunner-yellow hover:bg-partrunner-yellow-dark text-partrunner-black font-medium rounded-xl transition-colors shadow-partrunner"
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-partrunner-gray-light p-4 mb-6 shadow-card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-partrunner-gray-dark/50" />
            <input
              type="text"
              placeholder="Buscar por UUID, RFC o nombre..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-3 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black placeholder-partrunner-gray-dark/50 focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50 focus:border-partrunner-yellow"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
              showFilters 
                ? 'bg-partrunner-yellow/10 border-partrunner-yellow text-partrunner-yellow-accent' 
                : 'bg-partrunner-bg-main border-partrunner-gray-light text-partrunner-gray-dark hover:text-partrunner-black'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filtros
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-partrunner-gray-light">
              {/* Week Filter */}
              <div>
                <label className="block text-sm text-partrunner-gray-dark mb-2">Semana</label>
                <select
                  value={filters.week}
                  onChange={(e) => setFilters(prev => ({ ...prev, week: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50"
                >
                  <option value="">Todas</option>
                  {weekOptions.map(week => (
                    <option key={week} value={week}>Semana {week}</option>
                  ))}
                </select>
              </div>

              {/* Payment Program Filter */}
              <div>
                <label className="block text-sm text-partrunner-gray-dark mb-2">Programa de Pago</label>
                <select
                  value={filters.paymentProgram}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentProgram: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50"
                >
                  <option value="">Todos</option>
                  <option value="pronto_pago">Pronto Pago</option>
                  <option value="standard">Estándar</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm text-partrunner-gray-dark mb-2">Estado</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-partrunner-bg-main border border-partrunner-gray-light rounded-xl text-partrunner-black focus:outline-none focus:ring-2 focus:ring-partrunner-yellow/50"
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
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-partrunner-gray-light/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.needsReview}
                  onChange={(e) => setFilters(prev => ({ ...prev, needsReview: e.target.checked }))}
                  className="w-4 h-4 rounded border-partrunner-gray-light text-amber-500 focus:ring-amber-500"
                />
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-partrunner-gray-dark text-sm">Requiere revisión de proyecto</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isLate}
                  onChange={(e) => setFilters(prev => ({ ...prev, isLate: e.target.checked }))}
                  className="w-4 h-4 rounded border-partrunner-gray-light text-orange-500 focus:ring-orange-500"
                />
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-partrunner-gray-dark text-sm">Extemporáneas</span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-partrunner-gray-light shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-partrunner-yellow-accent animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={fetchInvoices}
              className="px-4 py-2 bg-partrunner-yellow text-partrunner-black font-medium rounded-lg hover:bg-partrunner-yellow-dark"
            >
              Reintentar
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-partrunner-gray-light mx-auto mb-4" />
            <p className="text-partrunner-gray-dark">No se encontraron facturas</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-partrunner-gray-light bg-partrunner-bg-main">
                    <th className="text-left px-6 py-4 text-sm font-medium text-partrunner-gray-dark">Emisor</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-partrunner-gray-dark">Folio/UUID</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-partrunner-gray-dark">Proyecto</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-partrunner-gray-dark">Programa</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-partrunner-gray-dark">Monto</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-partrunner-gray-dark">Estado</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-partrunner-gray-dark">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      className={`border-b border-partrunner-gray-light/50 hover:bg-gray-50 transition-colors ${
                        invoice.is_late ? 'bg-orange-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-partrunner-black font-medium truncate max-w-[180px]">
                              {invoice.issuer_name}
                            </p>
                            <p className="text-partrunner-gray-dark text-sm">{invoice.issuer_rfc}</p>
                          </div>
                          {invoice.is_late && (
                            <span className="flex-shrink-0 flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full border border-orange-200 font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              EXTEMP.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-partrunner-black font-mono text-sm">{invoice.folio || '-'}</p>
                          <p className="text-partrunner-gray-dark text-xs truncate max-w-[150px]">
                            {invoice.uuid}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-partrunner-black">
                            {invoice.project_name || '-'}
                          </span>
                          {invoice.needs_project_review && (
                            <span title="Requiere revisión de proyecto">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {invoice.payment_program === 'pronto_pago' ? (
                            <>
                              <Zap className="w-4 h-4 text-amber-500" />
                              <span className="text-amber-600 text-sm font-medium">Pronto Pago</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-blue-500" />
                              <span className="text-blue-600 text-sm font-medium">Estándar</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-partrunner-black font-semibold">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                        {invoice.payment_program === 'pronto_pago' && invoice.net_payment_amount && (
                          <p className="text-emerald-500 text-xs">
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
                          className="p-2 text-partrunner-gray-dark hover:text-partrunner-black hover:bg-gray-100 rounded-lg transition-colors"
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
            <div className="lg:hidden divide-y divide-partrunner-gray-light">
              {invoices.map((invoice) => (
                <div 
                  key={invoice.id} 
                  className={`p-4 ${invoice.is_late ? 'bg-orange-50/50' : ''}`} 
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-partrunner-black font-medium">{invoice.issuer_name}</p>
                        {invoice.is_late && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full border border-orange-200 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            EXTEMP.
                          </span>
                        )}
                      </div>
                      <p className="text-partrunner-gray-dark text-sm">{invoice.issuer_rfc}</p>
                    </div>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {invoice.is_late ? (
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      ) : invoice.payment_program === 'pronto_pago' ? (
                        <Zap className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="text-partrunner-gray-dark text-sm">
                        S{invoice.payment_week}
                      </span>
                      {invoice.needs_project_review && (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-partrunner-black font-semibold">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-partrunner-gray-light bg-partrunner-bg-main">
              <p className="text-partrunner-gray-dark text-sm">
                Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-partrunner-gray-dark hover:text-partrunner-black hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-partrunner-black px-4 font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-partrunner-gray-dark hover:text-partrunner-black hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-partrunner-gray-light shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-partrunner-gray-light">
              <h3 className="text-xl font-semibold text-partrunner-black">Detalle de Factura</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-partrunner-gray-dark hover:text-partrunner-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Issuer Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-partrunner-bg-main rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-partrunner-gray-dark" />
                </div>
                <div>
                  <h4 className="text-partrunner-black font-semibold">{selectedInvoice.issuer_name}</h4>
                  <p className="text-partrunner-gray-dark">{selectedInvoice.issuer_rfc}</p>
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-partrunner-bg-main rounded-xl p-4">
                  <p className="text-partrunner-gray-dark text-sm mb-1">UUID</p>
                  <p className="text-partrunner-black font-mono text-sm break-all">{selectedInvoice.uuid}</p>
                </div>
                <div className="bg-partrunner-bg-main rounded-xl p-4">
                  <p className="text-partrunner-gray-dark text-sm mb-1">Folio</p>
                  <p className="text-partrunner-black">{selectedInvoice.folio || '-'}</p>
                </div>
                <div className="bg-partrunner-bg-main rounded-xl p-4">
                  <p className="text-partrunner-gray-dark text-sm mb-1">Fecha Factura</p>
                  <p className="text-partrunner-black">
                    {format(new Date(selectedInvoice.invoice_date), 'dd MMMM yyyy', { locale: es })}
                  </p>
                </div>
                <div className="bg-partrunner-bg-main rounded-xl p-4">
                  <p className="text-partrunner-gray-dark text-sm mb-1">Semana de Pago</p>
                  <p className="text-partrunner-black">Semana {selectedInvoice.payment_week}, {selectedInvoice.payment_year}</p>
                </div>
              </div>

              {/* Financial */}
              <div className="bg-partrunner-bg-main rounded-xl p-4">
                <h5 className="text-partrunner-gray-dark text-sm mb-4">Información Financiera</h5>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-partrunner-gray-dark">Total Factura</span>
                    <span className="text-partrunner-black font-semibold">{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                  {selectedInvoice.payment_program === 'pronto_pago' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-partrunner-gray-dark">Costo Financiero (8%)</span>
                        <span className="text-red-500">-{formatCurrency(selectedInvoice.pronto_pago_fee_amount || 0)}</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t border-partrunner-gray-light">
                        <span className="text-partrunner-black font-medium">Monto Neto a Pagar</span>
                        <span className="text-emerald-500 font-bold">{formatCurrency(selectedInvoice.net_payment_amount || selectedInvoice.total_amount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Late Invoice Alert */}
              {selectedInvoice.is_late && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200">
                  <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-orange-700 font-semibold">Factura Extemporánea</p>
                    <p className="text-orange-600 text-sm">
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
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-amber-700 font-semibold">Requiere Revisión</p>
                    <p className="text-amber-600 text-sm">
                      Proyecto no identificado automáticamente - revisar manualmente
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Program Badge */}
              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                selectedInvoice.payment_program === 'pronto_pago'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                {selectedInvoice.payment_program === 'pronto_pago' ? (
                  <>
                    <Zap className="w-6 h-6 text-amber-500" />
                    <div>
                      <p className="text-amber-700 font-semibold">Pronto Pago</p>
                      <p className="text-amber-600 text-sm">Pago en 1 día hábil</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="text-blue-700 font-semibold">Pago Estándar</p>
                      <p className="text-blue-600 text-sm">Pago la semana siguiente</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-partrunner-gray-light flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-6 py-2.5 bg-partrunner-bg-main hover:bg-gray-200 text-partrunner-black font-medium rounded-xl transition-colors"
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
