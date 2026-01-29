import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Receipt,
  CreditCard,
  Ban,
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  Calendar,
  DollarSign,
} from 'lucide-react';
import UserLayout from '../../components/user/UserLayout';
import { CSDUploadSection } from '../../components/user/CSDUploadSection';
import {
  listInvoices,
  downloadInvoiceXml,
  downloadInvoicePdf,
  downloadBlob,
  CSDStatus,
  InvoiceListItem,
} from '../../services/invoicingService';

// Modal components for creating invoices
import { IncomeInvoiceModal } from '../../components/user/modals/IncomeInvoiceModal';
import { CreditNoteModal } from '../../components/user/modals/CreditNoteModal';
import { PaymentComplementModal } from '../../components/user/modals/PaymentComplementModal';
import { CancellationModal } from '../../components/user/modals/CancellationModal';

type InvoiceType = 'I' | 'E' | 'P' | null;
type ModalType = 'income' | 'creditNote' | 'payment' | 'cancel' | null;

export const Invoicing: React.FC = () => {
  // CSD status
  const [csdStatus, setCsdStatus] = useState<CSDStatus | null>(null);
  const [showCsdSection, setShowCsdSection] = useState(false);

  // Invoice list
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<InvoiceType>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);

  // Download loading state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch invoices
  const fetchInvoices = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listInvoices({
        page,
        limit: pagination.limit,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setInvoices(response.items);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, searchQuery, pagination.limit]);

  // Load invoices on mount and filter change
  useEffect(() => {
    if (csdStatus?.invoicingEnabled) {
      fetchInvoices(1);
    }
  }, [csdStatus?.invoicingEnabled, typeFilter, statusFilter, fetchInvoices]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (csdStatus?.invoicingEnabled) {
        fetchInvoices(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle CSD status change
  const handleCsdStatusChange = (status: CSDStatus) => {
    setCsdStatus(status);
    if (status.invoicingEnabled) {
      setShowCsdSection(false);
    }
  };

  // Download handlers
  const handleDownloadXml = async (invoice: InvoiceListItem) => {
    setDownloadingId(invoice.id);
    try {
      const blob = await downloadInvoiceXml(invoice.id);
      downloadBlob(blob, `${invoice.uuid || invoice.facturapiId}.xml`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar XML');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadPdf = async (invoice: InvoiceListItem) => {
    setDownloadingId(invoice.id);
    try {
      const blob = await downloadInvoicePdf(invoice.id);
      downloadBlob(blob, `${invoice.uuid || invoice.facturapiId}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle invoice creation success
  const handleInvoiceCreated = () => {
    setActiveModal(null);
    fetchInvoices(1);
  };

  // Handle cancellation success
  const handleCancellationSuccess = () => {
    setActiveModal(null);
    setSelectedInvoice(null);
    fetchInvoices(pagination.page);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      stamped: 'bg-partrunner-green/10 text-partrunner-green',
      pending: 'bg-amber-100 text-amber-700',
      cancelled: 'bg-red-100 text-red-700',
      error: 'bg-red-100 text-red-700',
    };
    const names: Record<string, string> = {
      stamped: 'Timbrada',
      pending: 'Pendiente',
      cancelled: 'Cancelada',
      error: 'Error',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {names[status] || status}
      </span>
    );
  };

  // Get CFDI type icon
  const getCfdiTypeIcon = (type: string) => {
    switch (type) {
      case 'I':
        return <Receipt size={16} className="text-blue-500" />;
      case 'E':
        return <CreditCard size={16} className="text-amber-500" />;
      case 'P':
        return <DollarSign size={16} className="text-green-500" />;
      default:
        return <FileText size={16} className="text-gray-500" />;
    }
  };

  // Render when invoicing is disabled
  if (!csdStatus?.invoicingEnabled || showCsdSection) {
    return (
      <UserLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-partrunner-black">Facturación Electrónica</h1>
              <p className="text-gray-500 mt-1">Emite facturas, notas de crédito y complementos de pago</p>
            </div>
          </div>

          {!csdStatus?.invoicingEnabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-amber-700">Facturación no habilitada</p>
                <p className="text-sm text-amber-600">
                  Necesitas cargar tu Certificado de Sello Digital (CSD) para poder emitir facturas.
                </p>
              </div>
            </div>
          )}

          <CSDUploadSection onStatusChange={handleCsdStatusChange} />
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-partrunner-black">Facturación Electrónica</h1>
            <p className="text-gray-500 mt-1">Emite facturas, notas de crédito y complementos de pago</p>
        </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCsdSection(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Check size={16} />
              CSD Activo
            </button>
          </div>
        </div>

        {/* Create Invoice Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
            onClick={() => setActiveModal('income')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
          >
            <div className="p-2 bg-white/20 rounded-lg">
              <Receipt size={24} />
            </div>
            <div className="text-left">
              <p className="font-semibold">Factura de Ingreso</p>
              <p className="text-sm text-blue-100">Crear nueva factura</p>
            </div>
                </button>

                <button
            onClick={() => setActiveModal('creditNote')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-md"
          >
            <div className="p-2 bg-white/20 rounded-lg">
              <CreditCard size={24} />
            </div>
            <div className="text-left">
              <p className="font-semibold">Nota de Crédito</p>
              <p className="text-sm text-amber-100">Crear nota de crédito</p>
          </div>
          </button>

          <button
            onClick={() => setActiveModal('payment')}
            className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-md"
          >
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign size={24} />
        </div>
            <div className="text-left">
              <p className="font-semibold">Complemento de Pago</p>
              <p className="text-sm text-green-100">Registrar pago parcial</p>
          </div>
          </button>
        </div>

      {/* Filters */}
        <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por RFC o nombre..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-partrunner-yellow focus:border-partrunner-yellow"
            />
          </div>
          
            {/* Type filter */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
          <select
                value={typeFilter || ''}
                onChange={(e) => setTypeFilter((e.target.value || null) as InvoiceType)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-partrunner-yellow focus:border-partrunner-yellow"
          >
            <option value="">Todos los tipos</option>
                <option value="I">Facturas</option>
                <option value="E">Notas de Crédito</option>
                <option value="P">Complementos de Pago</option>
          </select>
            </div>
          
            {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-partrunner-yellow focus:border-partrunner-yellow"
          >
            <option value="">Todos los estados</option>
            <option value="stamped">Timbradas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          
          <button
              onClick={() => fetchInvoices(1)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
              <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Invoice List */}
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-partrunner-yellow-accent" size={32} />
            </div>
          ) : invoices.length === 0 ? (
          <div className="text-center py-12">
              <FileText className="mx-auto text-gray-300" size={48} />
              <p className="mt-4 text-gray-500">No hay facturas que mostrar</p>
              <p className="text-sm text-gray-400">Crea tu primera factura usando los botones de arriba</p>
          </div>
        ) : (
          <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UUID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receptor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getCfdiTypeIcon(invoice.cfdiType)}
                            <span className="text-sm font-medium">{invoice.cfdiTypeName}</span>
            </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-600">
                            {invoice.uuid ? invoice.uuid.substring(0, 8) + '...' : '-'}
                  </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-partrunner-black truncate max-w-[200px]">
                              {invoice.receiverName || '-'}
                            </p>
                            <p className="text-xs text-gray-500">{invoice.receiverRfc}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar size={14} />
                            {new Date(invoice.issueDate).toLocaleDateString('es-MX')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-partrunner-black">
                            ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDownloadXml(invoice)}
                              disabled={downloadingId === invoice.id}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Descargar XML"
                            >
                              {downloadingId === invoice.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(invoice)}
                              disabled={downloadingId === invoice.id}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Descargar PDF"
                            >
                              <FileText size={16} />
                            </button>
                            {invoice.status === 'stamped' && (
                              <button
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setActiveModal('cancel');
                                }}
                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Cancelar"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCfdiTypeIcon(invoice.cfdiType)}
                        <span className="text-sm font-medium">{invoice.cfdiTypeName}</span>
                </div>
                      {getStatusBadge(invoice.status)}
                </div>
                    <div>
                      <p className="text-sm font-medium text-partrunner-black">{invoice.receiverName || invoice.receiverRfc}</p>
                      <p className="text-xs text-gray-500 font-mono">{invoice.uuid?.substring(0, 16)}...</p>
                </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(invoice.issueDate).toLocaleDateString('es-MX')}
                      </span>
                      <span className="text-sm font-semibold">
                        ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleDownloadXml(invoice)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg"
                      >
                        <Download size={14} /> XML
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(invoice)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg"
                      >
                        <FileText size={14} /> PDF
                      </button>
                      {invoice.status === 'stamped' && (
                      <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setActiveModal('cancel');
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg"
                        >
                          <Ban size={14} /> Cancelar
                      </button>
                  )}
                </div>
              </div>
            ))}
      </div>

      {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Mostrando {invoices.length} de {pagination.totalItems} facturas
                  </p>
                  <div className="flex items-center gap-2">
          <button
                      onClick={() => fetchInvoices(pagination.page - 1)}
                      disabled={!pagination.hasPreviousPage}
                      className="p-2 text-gray-500 hover:text-partrunner-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
          </button>
                    <span className="text-sm text-gray-600">
                      Página {pagination.page} de {pagination.totalPages}
          </span>
          <button
                      onClick={() => fetchInvoices(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
                      className="p-2 text-gray-500 hover:text-partrunner-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={20} />
          </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'income' && (
        <IncomeInvoiceModal
          onClose={() => setActiveModal(null)}
          onSuccess={handleInvoiceCreated}
        />
      )}

      {activeModal === 'creditNote' && (
        <CreditNoteModal
          onClose={() => setActiveModal(null)}
          onSuccess={handleInvoiceCreated}
        />
      )}

      {activeModal === 'payment' && (
        <PaymentComplementModal
          onClose={() => setActiveModal(null)}
          onSuccess={handleInvoiceCreated}
        />
      )}

      {activeModal === 'cancel' && selectedInvoice && (
        <CancellationModal
          invoice={selectedInvoice}
          onClose={() => {
            setActiveModal(null);
            setSelectedInvoice(null);
          }}
          onSuccess={handleCancellationSuccess}
        />
      )}
    </UserLayout>
  );
};

export default Invoicing;
