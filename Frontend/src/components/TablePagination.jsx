export const TABLE_PAGE_SIZE = 10

import { useTranslate } from '../i18n.jsx'

export default function TablePagination({ total, page, onPageChange, pageSize = TABLE_PAGE_SIZE, label = 'rows' }) {
  const t = useTranslate()
  const pageCount = Math.ceil(total / pageSize)
  if (pageCount <= 1) return null

  const firstRow = (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)

  return <nav className="table-pagination" aria-label={t('Table pages')}>
    <span>{t('Showing')} {firstRow}–{lastRow} {t('of')} {total} {t(label)}</span>
    <div>
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>{t('Previous')}</button>
      <span aria-current="page">{t('Page')} {page} {t('of')} {pageCount}</span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>{t('Next')}</button>
    </div>
  </nav>
}
