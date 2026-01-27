import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  Calendar,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Banknote
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { exportInvoicesCSV, exportPaymentsXLSX, ExportFilters } from '../../services/adminService';

const Reports: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentWeek = Math.ceil(
    (new Date().getTime() - new Date(currentYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7)
  );

  const [filters, setFilters] = useState<ExportFilters>({
    weekFrom: 1,
    weekTo: currentWeek,
    year: currentYear,
    paymentProgram: '',
  });

  // Payment export filters (single week)
  const [paymentFilters, setPaymentFilters] = useState({
    week: currentWeek,
    year: currentYear,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPayments, setIsExportingPayments] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [paymentExportResult, setPaymentExportResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);

    const result = await exportInvoicesCSV(filters);
    
    setExportResult(result);
    setIsExporting(false);
  };

  const handleExportPayments = async () => {
    setIsExportingPayments(true);
    setPaymentExportResult(null);

    const result = await exportPaymentsXLSX({
      week: paymentFilters.week,
      year: paymentFilters.year,
    });
    
    setPaymentExportResult(result);
    setIsExportingPayments(false);
  };

  // Generate week options
  const weekOptions = Array.from({ length: 53 }, (_, i) => i + 1);
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Reportes</h1>
        <p className="text-slate-400">
          Exporta los datos de facturas en formato CSV
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Form */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Exportar Facturas</h2>
                <p className="text-slate-400 text-sm">Selecciona los filtros y descarga el reporte</p>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-6">
              {/* Period Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Período
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Año</label>
                    <select
                      value={filters.year}
                      onChange={(e) => setFilters(prev => ({ ...prev, year: parseInt(e.target.value, 10) }))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {yearOptions.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Semana Desde</label>
                    <select
                      value={filters.weekFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, weekFrom: parseInt(e.target.value, 10) }))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {weekOptions.map(week => (
                        <option key={week} value={week}>Semana {week}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Semana Hasta</label>
                    <select
                      value={filters.weekTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, weekTo: parseInt(e.target.value, 10) }))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {weekOptions.map(week => (
                        <option key={week} value={week}>Semana {week}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Program */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Programa de Pago
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, paymentProgram: '' }))}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                      !filters.paymentProgram
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-900/50 border-slate-600/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, paymentProgram: 'pronto_pago' }))}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                      filters.paymentProgram === 'pronto_pago'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-slate-900/50 border-slate-600/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    Pronto Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, paymentProgram: 'standard' }))}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                      filters.paymentProgram === 'standard'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-slate-900/50 border-slate-600/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    Estándar
                  </button>
                </div>
              </div>

              {/* Export Result */}
              {exportResult && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  exportResult.success 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {exportResult.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={exportResult.success ? 'text-emerald-300' : 'text-red-300'}>
                    {exportResult.message}
                  </span>
                </div>
              )}

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando reporte...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Descargar CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          {/* CSV Format Info */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Formato del Reporte</h3>
            <p className="text-slate-400 text-sm mb-4">
              El archivo CSV incluye las siguientes columnas:
            </p>
            <ul className="space-y-2 text-sm">
              {[
                'UUID',
                'Folio',
                'Fecha Factura',
                'RFC Emisor',
                'Nombre Emisor',
                'Proyecto',
                'Semana',
                'Año',
                'Programa Pago',
                'Total',
                'Costo Financiero',
                'Neto a Pagar',
                'Estado',
                'Fecha Registro',
              ].map((col, idx) => (
                <li key={idx} className="flex items-center gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  {col}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
            <h3 className="text-amber-300 font-semibold mb-3">💡 Tip</h3>
            <p className="text-amber-200/70 text-sm">
              El archivo CSV está optimizado para Excel con codificación UTF-8 BOM. 
              Puedes abrirlo directamente o importarlo en Google Sheets.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Export Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Banknote className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Archivo de Pagos (XLSX)</h2>
                <p className="text-slate-400 text-sm">Formato Shinkansen/BBVA para transferencias bancarias</p>
              </div>
            </div>

            {/* Payment Filters */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Semana de Pago
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Año</label>
                    <select
                      value={paymentFilters.year}
                      onChange={(e) => setPaymentFilters(prev => ({ ...prev, year: parseInt(e.target.value, 10) }))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Semana</label>
                    <select
                      value={paymentFilters.week}
                      onChange={(e) => setPaymentFilters(prev => ({ ...prev, week: parseInt(e.target.value, 10) }))}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {Array.from({ length: 53 }, (_, i) => i + 1).map(week => (
                        <option key={week} value={week}>Semana {week}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Export Result */}
              {paymentExportResult && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  paymentExportResult.success 
                    ? 'bg-emerald-500/10 border border-emerald-500/30' 
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {paymentExportResult.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={paymentExportResult.success ? 'text-emerald-300' : 'text-red-300'}>
                    {paymentExportResult.message}
                  </span>
                </div>
              )}

              {/* Payment Export Button */}
              <button
                onClick={handleExportPayments}
                disabled={isExportingPayments}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isExportingPayments ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando archivo de pagos...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Descargar XLSX de Pagos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* XLSX Format Info */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Formato XLSX</h3>
            <p className="text-slate-400 text-sm mb-4">
              Archivo compatible con Shinkansen/BBVA:
            </p>
            <ul className="space-y-2 text-sm">
              {[
                'Tipo de transacción',
                'Monto',
                'Moneda',
                'Nombre destinatario',
                'RFC destinatario',
                'Email destinatario',
                'Cuenta destino (CLABE)',
                'Descripción',
                'Cuenta origen',
              ].map((col, idx) => (
                <li key={idx} className="flex items-center gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  {col}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
            <h3 className="text-blue-300 font-semibold mb-3">📋 Nota</h3>
            <p className="text-blue-200/70 text-sm">
              El archivo agrupa las facturas por flotillero y suma los montos netos 
              a pagar (después del descuento de Pronto Pago si aplica).
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Reports;
