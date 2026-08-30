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
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const cellXml = (text, { header = false } = {}) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${
  header ? '<w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>' : ''
}</w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${
  header ? '<w:rPr><w:b/></w:rPr>' : ''
}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;

const rowXml = (cells, opts) => `<w:tr>${cells.map((c) => cellXml(c, opts)).join('')}</w:tr>`;

const TABLE_BORDERS = `<w:tblBorders>
<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
</w:tblBorders>`;

// title: string, headers: string[], rows: string[][]
export const buildDocxBytes = ({ title, headers, rows }) => {
  const headerRow = rowXml(headers, { header: true });
  const bodyRows = rows.length
    ? rows.map((r) => rowXml(r)).join('')
    : rowXml([`No records for this period.`, ...headers.slice(1).map(() => '')]);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t xml:space="preserve">${escapeXml(title)}</w:t></w:r></w:p>
<w:p/>
<w:tbl>
<w:tblPr><w:tblW w:w="0" w:type="auto"/>${TABLE_BORDERS}</w:tblPr>
<w:tblGrid>${headers.map(() => '<w:gridCol/>').join('')}</w:tblGrid>
${headerRow}
${bodyRows}
</w:tbl>
<w:sectPr>
<w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

  return createZip([
    { name: '[Content_Types].xml', data: utf8Encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: utf8Encode(ROOT_RELS) },
    { name: 'word/document.xml', data: utf8Encode(documentXml) },
  ]);
};
