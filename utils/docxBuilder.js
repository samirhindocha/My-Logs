// Builds a genuine OOXML .docx file (a real ZIP package with word/document.xml),
// so "Export .DOCX" produces an actual Word document instead of a relabeled PDF.
import { createZip, utf8Encode } from './zipWriter';

const escapeXml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
  ));

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;

// 14pt font (w:sz is in half-points) and a taller row (dxa, twentieths of a
// point) so cells read like the reference layout instead of default-size text.
const FONT_SZ = 28;
const ROW_HEIGHT_DXA = 420;

const cellXml = (text, width, { header = false } = {}) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${
  header ? '<w:shd w:val="clear" w:color="auto" w:fill="F3F3F3"/>' : ''
}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${
  header ? '<w:b/>' : ''
}<w:sz w:val="${FONT_SZ}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;

const rowXml = (cells, widths, { header = false } = {}) => `<w:tr><w:trPr><w:trHeight w:val="${ROW_HEIGHT_DXA}" w:hRule="atLeast"/>${
  header ? '<w:tblHeader/>' : ''
}</w:trPr>${cells.map((c, i) => cellXml(c, widths[i], { header })).join('')}</w:tr>`;

const TABLE_BORDERS = `<w:tblBorders>
<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
</w:tblBorders>`;

const FOOTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:p><w:pPr><w:jc w:val="center"/></w:pPr>
<w:r><w:fldChar w:fldCharType="begin"/></w:r>
<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
<w:r><w:fldChar w:fldCharType="separate"/></w:r>
<w:r><w:t>1</w:t></w:r>
<w:r><w:fldChar w:fldCharType="end"/></w:r>
</w:p>
</w:ftr>`;

// headers: string[], rows: string[][], columnWidths: number[] (dxa, one per column)
export const buildDocxBytes = ({ headers, rows, columnWidths }) => {
  const headerRow = rowXml(headers, columnWidths, { header: true });
  const bodyRows = rows.length
    ? rows.map((r) => rowXml(r, columnWidths)).join('')
    : rowXml([`No records for this period.`, ...headers.slice(1).map(() => '')], columnWidths);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
<w:tbl>
<w:tblPr><w:tblW w:w="0" w:type="auto"/>${TABLE_BORDERS}</w:tblPr>
<w:tblGrid>${columnWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>
${headerRow}
${bodyRows}
</w:tbl>
<w:sectPr>
<w:footerReference w:type="default" r:id="rIdFooter1"/>
<w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

  return createZip([
    { name: '[Content_Types].xml', data: utf8Encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: utf8Encode(ROOT_RELS) },
    { name: 'word/document.xml', data: utf8Encode(documentXml) },
    { name: 'word/footer1.xml', data: utf8Encode(FOOTER_XML) },
    { name: 'word/_rels/document.xml.rels', data: utf8Encode(DOCUMENT_RELS) },
  ]);
};
