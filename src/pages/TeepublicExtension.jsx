import { useState } from 'react';
import { Alert, Button, Card, Empty, Input, message, Select, Space, Statistic, Table, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { summarize } from '../../extension/research.mjs';
import { validateScan } from '../utils/extensionImport.mjs';
import { requestBrowserScan } from '../utils/browserBridge.mjs';

const KEY = 'spytee_extension_imports_v1';

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(saved) ? saved.slice(0, 30).map(validateScan) : [];
  } catch { return []; }
}

export default function TeepublicExtension() {
  const [history, setHistory] = useState(loadHistory);
  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [bridgeError, setBridgeError] = useState('');
  const scan = history[selected];
  const stats = summarize(scan?.products || []);
  const products = (scan?.products || []).filter((item) =>
    [item.title, item.author, item.mainTag, ...item.tags].join(' ').toLowerCase().includes(filter.toLowerCase()));

  function saveScan(input) {
    const imported = validateScan(input);
    const next = [imported, ...history.filter((item) => item.scannedAt !== imported.scannedAt || item.sourceUrl !== imported.sourceUrl)].slice(0, 30);
    localStorage.setItem(KEY, JSON.stringify(next));
    setHistory(next);
    setSelected(0);
    setBridgeError('');
    message.success(`Đã nhận ${imported.products.length} sản phẩm. Ngày quét: ${new Date(imported.scannedAt).toLocaleString('vi-VN')}`);
  }

  async function receiveFromExtension() {
    setReceiving(true);
    setBridgeError('');
    try { saveScan(await requestBrowserScan()); }
    catch (error) { setBridgeError(error.message); }
    finally { setReceiving(false); }
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('File quá lớn (tối đa 5 MB).');
      saveScan(JSON.parse(await file.text()));
    } catch (error) {
      message.error(error.message);
    }
  }

  return (
    <main className="sy-main">
      <div className="sy-content">
        <Card className="sy-card" style={{ marginBottom: 14 }}>
          <Space wrap>
            <h2 className="sy-title">TeePublic Extension</h2>
            <Link to="/teepublic">Về TeePublic Trend</Link>
            <Button href="/downloads/spytee-teepublic-extension.zip?v=0.3.0" download>Tải extension Chrome 0.3 (.zip)</Button>
            <Button type="primary" loading={receiving} onClick={receiveFromExtension}>Nhận kết quả trực tiếp từ extension</Button>
            <Button htmlType="button" onClick={() => document.getElementById('extension-json-file').click()}>Nhập JSON từ extension</Button>
            <input id="extension-json-file" type="file" accept=".json,application/json" hidden onChange={importFile} />
          </Space>
          <p style={{ marginTop: 12 }}>Mở TeePublic → bấm icon SPYTEE → Quét trang hiện tại → quay lại đây và bấm Nhận kết quả trực tiếp từ extension. Không cần xuất JSON.</p>
          <p>Cài đặt: giải nén file ZIP → chrome://extensions → bật Developer mode → Load unpacked → chọn thư mục chứa manifest.json.</p>
          <p>Đã cài bản cũ: giải nén đè vào thư mục extension đang dùng, bấm Reload trong chrome://extensions rồi tải lại trang SPYTEE này.</p>
          <Alert type="info" showIcon title="Dữ liệu trong mẫu trang đã quét. Tần suất tag không phải lượt tìm kiếm; thứ tự sản phẩm không mặc định là thứ hạng bán chạy." />
          {bridgeError && <Alert type="warning" showIcon style={{ marginTop: 12 }} title={bridgeError} />}
        </Card>
        {!scan ? <Empty description="Chưa có phiên quét. Quét TeePublic bằng extension rồi bấm Nhận kết quả trực tiếp." /> : <>
          <Card className="sy-card" style={{ marginBottom: 14 }}>
            <Space wrap size={24}>
              <Statistic title="Thiết kế riêng biệt" value={stats.designs} />
              <Statistic title="Tag đọc được" value={stats.topTags.length} />
              <Statistic title="Người bán đọc được" value={stats.authors.length} />
              <Select aria-label="Phiên quét" value={selected} style={{ minWidth: 230 }} onChange={setSelected}
                options={history.map((item, index) => ({ value: index, label: `${new Date(item.scannedAt).toLocaleString('vi-VN')} (${item.products.length})` }))} />
            </Space>
            <p style={{ marginTop: 12 }}><a href={scan.sourceUrl} target="_blank" rel="noreferrer">{scan.pageTitle || scan.sourceUrl}</a></p>
          </Card>
          <Card className="sy-card" title="Top Tags trong mẫu" style={{ marginBottom: 14 }}>
            {stats.topTags.length ? <Space wrap>{stats.topTags.slice(0, 50).map((item) => <Tag key={item.tag.toLowerCase()}>{item.tag}: {item.count}</Tag>)}</Space>
              : <p>Trang chưa cung cấp tag đọc được. Quét trang chi tiết thiết kế để bổ sung.</p>}
          </Card>
          <Card className="sy-card" title="Người bán trong mẫu" style={{ marginBottom: 14 }}>
            {stats.authors.length ? <Space wrap>{stats.authors.map((item) => <Tag key={item.author}>{item.author}: {item.count} thiết kế</Tag>)}</Space> : <p>Chưa đọc được thông tin người bán.</p>}
          </Card>
          <Card className="sy-card">
            <Input aria-label="Lọc sản phẩm" placeholder="Lọc sản phẩm, tag, người bán..." value={filter} onChange={(event) => setFilter(event.target.value)} style={{ marginBottom: 12 }} />
            <Table dataSource={products} rowKey={(item) => `${item.section}:${item.type}:${item.id}:${item.rank}`} scroll={{ x: 800 }}
              pagination={{ defaultPageSize: 20, showSizeChanger: true }} columns={[
                { title: '#', dataIndex: 'rank', width: 55 },
                { title: 'Nhóm trên trang', dataIndex: 'section', width: 150 },
                { title: 'Thiết kế', dataIndex: 'title', render: (title, item) => <a href={item.url} target="_blank" rel="noreferrer">{title}</a> },
                { title: 'Người bán', dataIndex: 'author', render: (value) => value || 'Chưa đọc được' },
                { title: 'Main Tag', dataIndex: 'mainTag', render: (value) => value || 'Chưa đọc được' },
                { title: 'Tags', dataIndex: 'tags', render: (tags) => tags.join(', ') || 'Chưa đọc được' },
              ]} />
          </Card>
        </>}
      </div>
    </main>
  );
}
