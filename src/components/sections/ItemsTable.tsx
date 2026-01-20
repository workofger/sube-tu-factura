import React from 'react';
import { List, Trash2 } from 'lucide-react';
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
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="bg-yellow-100 text-yellow-700 p-1.5 rounded-lg">
            <List size={18} />
          </span>
          <h3 className="font-bold text-gray-800 text-lg">4. Conceptos de la Factura</h3>
        </div>
        <span className="text-sm text-gray-500">
          {items.length} concepto{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
            <tr>
              <th className="px-4 py-3 rounded-tl-xl w-1/3">Descripción</th>
              <th className="px-4 py-3 w-20">Clave</th>
              <th className="px-4 py-3 w-20">Cant.</th>
              <th className="px-4 py-3 w-20">Unidad</th>
              <th className="px-4 py-3 w-28">P. Unitario</th>
              <th className="px-4 py-3 w-28">Importe</th>
              <th className="px-4 py-3 w-16 rounded-tr-xl"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 italic">
                  No hay conceptos extraídos. Sube el XML para extraer automáticamente.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index} className="hover:bg-yellow-50/30 transition-colors group">
                  <td className="px-4 py-2">
                    <textarea 
                      className="w-full bg-transparent border border-transparent focus:border-yellow-400 focus:bg-white rounded-md outline-none py-1 px-1 resize-y min-h-[40px] text-gray-700"
                      value={item.description}
                      onChange={(e) => onItemChange(index, 'description', e.target.value)}
                      placeholder="Descripción del item"
                      rows={1}
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input 
                      className="w-full bg-transparent border-b border-transparent focus:border-yellow-400 outline-none py-1 text-center text-xs text-gray-500"
                      value={item.productKey || ''}
                      onChange={(e) => onItemChange(index, 'productKey', e.target.value)}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input 
                      type="number"
                      className="w-full bg-transparent border-b border-transparent focus:border-yellow-400 outline-none py-1 text-center"
                      value={item.quantity}
                      onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input 
                      className="w-full bg-transparent border-b border-transparent focus:border-yellow-400 outline-none py-1 text-center uppercase text-xs"
                      value={item.unit || ''}
                      onChange={(e) => onItemChange(index, 'unit', e.target.value)}
                      placeholder="PZA"
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input 
                      type="number"
                      className="w-full bg-transparent border-b border-transparent focus:border-yellow-400 outline-none py-1 text-right"
                      value={item.unitPrice}
                      onChange={(e) => onItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input 
                      type="number"
                      className="w-full bg-transparent border-b border-transparent focus:border-yellow-400 outline-none py-1 text-right font-medium text-gray-800"
                      value={item.amount}
                      onChange={(e) => onItemChange(index, 'amount', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-2 text-center align-top">
                    <button 
                      type="button" 
                      onClick={() => onDeleteItem(index)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-gray-50 font-bold text-gray-800 text-xs uppercase">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-gray-500">Suma Conceptos:</td>
                <td className="px-4 py-3 text-right">
                  ${formatNumber(itemsTotal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
