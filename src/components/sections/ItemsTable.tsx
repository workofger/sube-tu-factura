import React from 'react';
import { List, Trash2, Package } from 'lucide-react';
import { InvoiceItem } from '../../types/invoice';
import { formatNumber } from '../../utils/formatters';

interface ItemsTableProps {
  items: InvoiceItem[];
  onItemChange: (index: number, field: keyof InvoiceItem, value: any) => void;
  onDeleteItem: (index: number) => void;
  itemsTotal: number;
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  onItemChange,
  onDeleteItem,
  itemsTotal,
}) => {
  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="section-header">
        <span className="section-icon">
          <Package size={18} />
        </span>
        <h3 className="section-title">Conceptos de la Factura</h3>
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-partrunner-gray-dark px-3 py-1 rounded-full">
          {items.length} concepto{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-partrunner-black/50 text-gray-600 dark:text-gray-400 font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3 w-1/3">Descripción</th>
                <th className="px-4 py-3 w-20">Clave</th>
                <th className="px-4 py-3 w-20">Cant.</th>
                <th className="px-4 py-3 w-20">Unidad</th>
                <th className="px-4 py-3 w-28">P. Unitario</th>
                <th className="px-4 py-3 w-28">Importe</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-partrunner-gray-dark">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                      <List size={32} />
                      <span>No hay conceptos extraídos</span>
                      <span className="text-xs">Sube el XML para extraer automáticamente</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index} className="hover:bg-partrunner-yellow/5 dark:hover:bg-partrunner-yellow/5 transition-colors group">
                    <td className="px-4 py-3">
                      <textarea 
                        className="w-full bg-transparent border border-transparent focus:border-partrunner-yellow focus:bg-white dark:focus:bg-partrunner-charcoal rounded-lg outline-none py-2 px-2 resize-y min-h-[40px] text-gray-700 dark:text-gray-300 transition-colors"
                        value={item.description}
                        onChange={(e) => onItemChange(index, 'description', e.target.value)}
                        placeholder="Descripción del item"
                        rows={1}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input 
                        className="w-full bg-transparent border-b border-transparent focus:border-partrunner-yellow outline-none py-1 text-center text-xs text-gray-500 dark:text-gray-400"
                        value={item.productKey || ''}
                        onChange={(e) => onItemChange(index, 'productKey', e.target.value)}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input 
                        type="number"
                        className="w-full bg-transparent border-b border-transparent focus:border-partrunner-yellow outline-none py-1 text-center text-gray-700 dark:text-gray-300"
                        value={item.quantity}
                        onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input 
                        className="w-full bg-transparent border-b border-transparent focus:border-partrunner-yellow outline-none py-1 text-center uppercase text-xs text-gray-500 dark:text-gray-400"
                        value={item.unit || ''}
                        onChange={(e) => onItemChange(index, 'unit', e.target.value)}
                        placeholder="PZA"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input 
                        type="number"
                        className="w-full bg-transparent border-b border-transparent focus:border-partrunner-yellow outline-none py-1 text-right text-gray-700 dark:text-gray-300"
                        value={item.unitPrice}
                        onChange={(e) => onItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input 
                        type="number"
                        className="w-full bg-transparent border-b border-transparent focus:border-partrunner-yellow outline-none py-1 text-right font-semibold text-gray-900 dark:text-white"
                        value={item.amount}
                        onChange={(e) => onItemChange(index, 'amount', parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <button 
                        type="button" 
                        onClick={() => onDeleteItem(index)}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-partrunner-black/50 font-bold text-xs">
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-right text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Suma Conceptos:
                  </td>
                  <td className="px-4 py-4 text-right text-gray-900 dark:text-white text-base">
                    ${formatNumber(itemsTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
