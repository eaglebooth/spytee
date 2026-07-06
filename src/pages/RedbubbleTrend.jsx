import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  message,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import { ArrowDown, ArrowUp, Clock, ExternalLink, Minus, Search, Star } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import {
  fetchIndexedProducts,
  fetchTrendingSearches,
  getCompetitionLevel,
  REDBUBBLE_PRODUCTS,
} from '../api/redbubble';
import {
  compareRankings,
  loadScopedSnapshots,
  loadSnapshots,
  saveScopedSnapshot,
  saveSnapshot,
} from '../utils/storage';
import './RedbubbleTrend.css';

dayjs.extend(relativeTime);
dayjs.locale('vi');

function TrendIcon({ trend }) {
  if (trend === 'up') return <ArrowUp size={13} />;
  if (trend === 'down') return <ArrowDown size={13} />;
  if (trend === 'new') return <Star size={13} />;
  return <Minus size={13} />;
}

function getHistory(mode, product, keyword) {
  if (mode === 'trends') return loadSnapshots();
  const scope = mode === 'products' ? product : keyword.trim().toLowerCase();
  return scope ? loadScopedSnapshots(mode, scope) : [];
}

export default function RedbubbleTrend() {
  const [mode, setMode] = useState('trends');
  const [product, setProduct] = useState('t-shirt');
  const [keyword, setKeyword] = useState('');
  const [filterText, setFilterText] = useState('');
  const [data, setData] = useState([]);
  const [history, setHistory] = useState(loadSnapshots);
  const [loading, setLoading] = useState(false);
  const [competition, setCompetition] = useState(null);

  const loadData = useCallback(async () => {
    if (mode === 'competition' && !keyword.trim()) {
      message.warning('Nhập keyword cần kiểm tra.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'trends') {
        const response = await fetchTrendingSearches();
        const keywords = (response.data?.trending_searches || []).map((item, index) => ({
          key: item.keywords,
          rank: index + 1,
          keywords: item.keywords,
          url: `https://www.redbubble.com/shop/${encodeURIComponent(item.keywords)}`,
        }));
        const snapshots = loadSnapshots();
        const compared = compareRankings(
          keywords,
          snapshots,
          (item) => item.keywords.toLowerCase()
        );
        const entry = saveSnapshot({ trending_searches: keywords });

        setData(compared);
        setHistory([entry, ...snapshots].slice(0, 100));
        setCompetition(null);
        message.success(`Đã cập nhật ${keywords.length} keyword`);
        return;
      }

      const products = await fetchIndexedProducts({
        keyword: mode === 'competition' ? keyword.trim() : '',
        product: mode === 'products' ? product : '',
        pages: 1,
      });
      const scope = mode === 'products' ? product : keyword.trim().toLowerCase();
      const snapshots = loadScopedSnapshots(mode, scope);
      const compared = compareRankings(products, snapshots, (item) => item.url);
      const entry = saveScopedSnapshot(mode, scope, products);

      setData(compared);
      setHistory([entry, ...snapshots].slice(0, 100));
      setCompetition(mode === 'competition' ? getCompetitionLevel(products.length) : null);
      message.success(`Đã tìm thấy ${products.length} sản phẩm được index`);
    } catch (error) {
      message.error(`Không thể tải dữ liệu Redbubble: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [keyword, mode, product]);

  useEffect(() => {
    if (mode !== 'trends') return undefined;
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData, mode]);

  const filteredData = filterText
    ? data.filter((item) => {
        const value = mode === 'trends'
          ? item.keywords
          : [item.title, item.artist, item.snippet].join(' ');
        return value.toLowerCase().includes(filterText.toLowerCase());
      })
    : data;

  const upCount = data.filter((item) => item.trend === 'up').length;
  const downCount = data.filter((item) => item.trend === 'down').length;
  const newCount = data.filter((item) => item.trend === 'new').length;
  const itemLabel = mode === 'trends' ? 'kw' : 'sp';

  const keywordColumns = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 60,
      align: 'center',
      render: (rank) => <span className="sy-rank">{rank}</span>,
    },
    {
      title: 'Keyword',
      dataIndex: 'keywords',
      render: (text, record) => (
        <Space size={8}>
          <a href={record.url} target="_blank" rel="noreferrer" className="sy-keyword">
            {text}
          </a>
          {record.trend !== 'same' && (
            <span className={`sy-trend-badge sy-trend-${record.trend}`}>
              <TrendIcon trend={record.trend} />
              {record.trend === 'up' && `+${record.rankChange}`}
              {record.trend === 'down' && `-${record.rankChange}`}
              {record.trend === 'new' && 'Mới'}
            </span>
          )}
        </Space>
      ),
    },
    {
      title: 'Trang Redbubble',
      dataIndex: 'url',
      width: 320,
      ellipsis: true,
      render: (url) => (
        <Tooltip title={url}>
          <a href={url} target="_blank" rel="noreferrer" className="sy-url">
            <ExternalLink size={11} />
            {url.replace('https://www.redbubble.com/shop/', '')}
          </a>
        </Tooltip>
      ),
    },
    {
      title: 'Biến động',
      width: 110,
      align: 'center',
      render: (_, record) => {
        const labels = { up: 'Lên', down: 'Xuống', new: 'Mới', same: 'Không đổi' };
        return (
          <span className={`sy-trend-text sy-trend-text-${record.trend}`}>
            {labels[record.trend]}
          </span>
        );
      },
    },
  ];

  const productColumns = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 60,
      align: 'center',
      render: (rank) => <span className="sy-rank">{rank}</span>,
    },
    {
      title: 'Sản phẩm được index',
      dataIndex: 'title',
      render: (title, record) => (
        <div className="rb-product-cell">
          <a href={record.url} target="_blank" rel="noreferrer" className="sy-keyword">
            {title}
          </a>
          {record.artist && <span>Artist: {record.artist}</span>}
          {record.snippet && <p>{record.snippet}</p>}
        </div>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      width: 300,
      ellipsis: true,
      render: (url) => (
        <Tooltip title={url}>
          <a href={url} target="_blank" rel="noreferrer" className="sy-url">
            <ExternalLink size={11} />
            Mở sản phẩm
          </a>
        </Tooltip>
      ),
    },
    {
      title: 'Biến động',
      width: 105,
      align: 'center',
      render: (_, record) => (
        <span className={`sy-trend-badge sy-trend-${record.trend}`}>
          <TrendIcon trend={record.trend} />
          {record.trend === 'up' && `+${record.rankChange}`}
          {record.trend === 'down' && `-${record.rankChange}`}
          {record.trend === 'new' && 'Mới'}
          {record.trend === 'same' && '—'}
        </span>
      ),
    },
  ];

  const changeMode = (value) => {
    setMode(value);
    setData([]);
    setCompetition(null);
    setFilterText('');
    setHistory(getHistory(value, product, keyword));
  };

  const restoreSnapshot = (snapshot) => {
    const items = snapshot.data.trending_searches || snapshot.data;
    setData(items.map((item, index) => ({
      ...item,
      rank: index + 1,
      trend: 'same',
      rankChange: 0,
    })));
  };

  return (
    <div className="sy-page">
      <main className="sy-main">
        <div className="sy-content">
          <Card className="sy-card sy-card-header" style={{ marginBottom: 14 }}>
            <div className="sy-header-row">
              <div>
                <h2 className="sy-title">Redbubble Spy</h2>
                {history[0] && (
                  <span className="sy-updated">
                    <Clock size={12} /> Cập nhật {dayjs(history[0].timestamp).fromNow()}
                  </span>
                )}
              </div>
              <Space size={10} wrap>
                <Segmented
                  value={mode}
                  options={[
                    { label: 'Trending Keywords', value: 'trends' },
                    { label: 'Product Spy', value: 'products' },
                    { label: 'Keyword Competition', value: 'competition' },
                  ]}
                  onChange={changeMode}
                />
                {mode === 'products' && (
                  <Select
                    value={product}
                    options={REDBUBBLE_PRODUCTS}
                    className="rb-product-select"
                    onChange={(value) => {
                      setProduct(value);
                      setData([]);
                      setHistory(loadScopedSnapshots('products', value));
                    }}
                  />
                )}
                {mode === 'competition' && (
                  <Input
                    value={keyword}
                    placeholder="Nhập keyword..."
                    className="rb-keyword-input"
                    onChange={(event) => setKeyword(event.target.value)}
                    onPressEnter={loadData}
                  />
                )}
                <Input
                  value={filterText}
                  placeholder="Lọc kết quả..."
                  allowClear
                  className="rb-filter-input"
                  onChange={(event) => setFilterText(event.target.value)}
                />
                <Button
                  type="primary"
                  icon={<Search size={14} />}
                  onClick={loadData}
                  loading={loading}
                  className="sy-scan-btn"
                >
                  Quét mới
                </Button>
              </Space>
            </div>
          </Card>

          {competition && (
            <Card className="sy-card rb-competition-card">
              <div>
                <span>Keyword</span>
                <strong>{keyword}</strong>
              </div>
              <div>
                <span>Mẫu kết quả index</span>
                <strong>{data.length}</strong>
              </div>
              <div>
                <span>Mức cạnh tranh ước tính</span>
                <Tag color={competition.color}>{competition.label}</Tag>
              </div>
            </Card>
          )}

          {data.length > 0 && (
            <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
              <Col xs={24} sm={8}>
                <Card className="sy-stat sy-stat-up">
                  <Statistic title="Đang lên" value={upCount} suffix={itemLabel} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="sy-stat sy-stat-down">
                  <Statistic title="Đang xuống" value={downCount} suffix={itemLabel} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="sy-stat sy-stat-new">
                  <Statistic title="Mới" value={newCount} suffix={itemLabel} />
                </Card>
              </Col>
            </Row>
          )}

          <Card className="sy-card sy-card-table">
            {filteredData.length === 0 && !loading ? (
              <Empty
                description={
                  mode === 'competition'
                    ? 'Nhập keyword và bấm Quét mới.'
                    : 'Chưa có dữ liệu. Bấm Quét mới để bắt đầu.'
                }
                style={{ padding: '48px 0' }}
              />
            ) : (
              <Table
                rowKey="key"
                columns={mode === 'trends' ? keywordColumns : productColumns}
                dataSource={filteredData}
                loading={loading}
                scroll={{ x: 760 }}
                pagination={{
                  defaultPageSize: 20,
                  showSizeChanger: true,
                  pageSizeOptions: [20, 50, 100],
                  showTotal: (total) => `Tổng ${total} ${mode === 'trends' ? 'keyword' : 'sản phẩm'}`,
                }}
              />
            )}
          </Card>

          {history.length > 1 && (
            <Card className="sy-card sy-card-history" style={{ marginTop: 14 }}>
              <h3 className="sy-history-title">
                <Clock size={14} /> Lịch sử quét ({history.length} lần)
              </h3>
              <div className="sy-history-tags">
                {history.slice(0, 15).map((snapshot) => (
                  <Tooltip key={snapshot.id} title={dayjs(snapshot.timestamp).format('DD/MM/YYYY HH:mm')}>
                    <Tag
                      color={snapshot.id === history[0]?.id ? 'cyan' : 'default'}
                      className="rb-history-tag"
                      onClick={() => restoreSnapshot(snapshot)}
                    >
                      {dayjs(snapshot.timestamp).format('HH:mm DD/MM')}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            </Card>
          )}

          <p className="rb-source-note">
            {mode === 'trends'
              ? 'Nguồn: endpoint typeahead của Redbubble, hiện chỉ trả về nhóm keyword giới hạn.'
              : 'Nguồn sản phẩm: các trang Redbubble được công cụ tìm kiếm index. Thứ hạng và mức cạnh tranh là tín hiệu ước tính, không phải doanh số hoặc tổng kết quả nội bộ Redbubble.'}
          </p>
        </div>
      </main>
    </div>
  );
}
