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
  fetchBestSellers,
  fetchTrendingTags,
  fetchTrendingToday,
  TEEPUBLIC_PRODUCTS,
} from '../api/teepublic';
import {
  compareRankings,
  loadProductSnapshots,
  loadTeepublicSnapshots,
  saveProductSnapshot,
  saveTeepublicSnapshot,
} from '../utils/teepublicStorage';
import './TeepublicTrend.css';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Search: SearchInput } = Input;

function TrendIcon({ trend }) {
  if (trend === 'up') return <ArrowUp size={13} />;
  if (trend === 'down') return <ArrowDown size={13} />;
  if (trend === 'new') return <Star size={13} />;
  return <Minus size={13} />;
}

function getHistory(mode, product) {
  return mode === 'tags'
    ? loadTeepublicSnapshots()
    : loadProductSnapshots(mode, product);
}

export default function TeepublicTrend() {
  const [data, setData] = useState([]);
  const [history, setHistory] = useState(loadTeepublicSnapshots);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [mode, setMode] = useState('tags');
  const [product, setProduct] = useState('t-shirts');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'tags') {
        const tags = await fetchTrendingTags();
        const snapshots = loadTeepublicSnapshots();
        const compared = compareRankings(
          tags,
          snapshots,
          (item) => item.keywords.toLowerCase()
        );
        const entry = saveTeepublicSnapshot(tags);

        setData(compared);
        setHistory([entry, ...snapshots].slice(0, 100));
        message.success(`Đã cập nhật ${tags.length} tag TeePublic`);
      } else {
        const products = mode === 'best-sellers'
          ? await fetchBestSellers(product)
          : await fetchTrendingToday(product);
        const snapshots = loadProductSnapshots(mode, product);
        const compared = compareRankings(products, snapshots, (item) => item.url);
        const entry = saveProductSnapshot(mode, product, products);
        const label = mode === 'best-sellers' ? 'Best Sellers' : 'Trending Today';

        setData(compared);
        setHistory([entry, ...snapshots].slice(0, 100));
        message.success(`Đã cập nhật ${products.length} sản phẩm ${label}`);
      }
    } catch (error) {
      message.error(`Không thể tải TeePublic Trend: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [mode, product]);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filteredData = searchText
    ? data.filter((item) => {
        const searchable = mode === 'tags'
          ? item.keywords
          : [item.title, item.mainTag, item.author, ...item.relatedTags].join(' ');
        return searchable.toLowerCase().includes(searchText.toLowerCase());
      })
    : data;

  const upCount = data.filter((item) => item.trend === 'up').length;
  const downCount = data.filter((item) => item.trend === 'down').length;
  const newCount = data.filter((item) => item.trend === 'new').length;
  const itemLabel = mode === 'tags' ? 'tag' : 'sản phẩm';

  const tagColumns = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 64,
      align: 'center',
      render: (rank) => <span className="sy-rank">{rank}</span>,
    },
    {
      title: 'Tag xu hướng',
      dataIndex: 'keywords',
      render: (keyword, record) => (
        <Space size={8}>
          <a className="sy-keyword" href={record.url} target="_blank" rel="noreferrer">
            {keyword}
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
      title: 'Trang TeePublic',
      dataIndex: 'url',
      width: 310,
      ellipsis: true,
      render: (url) => (
        <Tooltip title={url}>
          <a className="sy-url" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={11} />
            {url.replace('https://www.teepublic.com/t-shirts/', '')}
          </a>
        </Tooltip>
      ),
    },
    {
      title: 'Biến động',
      key: 'trend',
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
      width: 58,
      align: 'center',
      render: (rank) => <span className="sy-rank">{rank}</span>,
    },
    {
      title: mode === 'best-sellers' ? 'Sản phẩm Best Seller' : 'Sản phẩm Trending Today',
      dataIndex: 'title',
      width: 280,
      render: (title, record) => (
        <div className="tp-product-cell">
          <a className="sy-keyword" href={record.url} target="_blank" rel="noreferrer">
            {title}
          </a>
          <span>by {record.author || 'Unknown'}</span>
        </div>
      ),
    },
    {
      title: 'Main Tag',
      dataIndex: 'mainTag',
      width: 220,
      render: (mainTag, record) => (
        <a className="tp-main-tag" href={record.mainTagUrl} target="_blank" rel="noreferrer">
          {mainTag}
        </a>
      ),
    },
    {
      title: 'Tag liên quan',
      dataIndex: 'relatedTags',
      render: (tags) => (
        <Space size={[4, 4]} wrap>
          {tags.length
            ? tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
            : <span className="tp-muted">Không có</span>}
        </Space>
      ),
    },
    {
      title: 'Biến động',
      key: 'trend',
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
    setHistory(getHistory(value, product));
  };

  const changeProduct = (value) => {
    setProduct(value);
    setData([]);
    setHistory(getHistory(mode, value));
  };

  return (
    <div className="sy-page">
      <main className="sy-main">
        <div className="sy-content">
          <Card className="sy-card sy-card-header" style={{ marginBottom: 14 }}>
            <div className="sy-header-row">
              <div>
                <h2 className="sy-title">TeePublic Trend</h2>
                {history[0] ? (
                  <span className="sy-updated">
                    <Clock size={12} /> Cập nhật {dayjs(history[0].timestamp).fromNow()}
                  </span>
                ) : (
                  <span className="tp-subtitle">Theo dõi tag và sản phẩm nổi bật trên TeePublic</span>
                )}
              </div>
              <Space size={10} wrap>
                <Segmented
                  value={mode}
                  options={[
                    { label: 'Trending Tags', value: 'tags' },
                    { label: 'Best Sellers', value: 'best-sellers' },
                    { label: 'Trending Today', value: 'trending-today' },
                  ]}
                  onChange={changeMode}
                />
                {mode !== 'tags' && (
                  <Select
                    value={product}
                    options={TEEPUBLIC_PRODUCTS}
                    className="tp-product-select"
                    onChange={changeProduct}
                  />
                )}
                <SearchInput
                  placeholder={mode === 'tags' ? 'Tìm tag...' : 'Tìm sản phẩm, tag...'}
                  allowClear
                  className="tp-search"
                  onChange={(event) => setSearchText(event.target.value)}
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
                description="Chưa có dữ liệu. Bấm Quét mới để lấy dữ liệu từ TeePublic."
                style={{ padding: '50px 0' }}
              />
            ) : (
              <Table
                rowKey="key"
                columns={mode === 'tags' ? tagColumns : productColumns}
                dataSource={filteredData}
                loading={loading}
                scroll={{ x: 760 }}
                pagination={{
                  defaultPageSize: 20,
                  showSizeChanger: true,
                  pageSizeOptions: [20, 50, 100, 200],
                  showTotal: (total) => `Tổng ${total} ${itemLabel}`,
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
                  <Tooltip key={snapshot.id} title={`${snapshot.data.length} ${itemLabel}`}>
                    <Tag
                      color={snapshot.id === history[0]?.id ? 'cyan' : 'default'}
                      className="tp-history-tag"
                      onClick={() => {
                        setData(
                          snapshot.data.map((item, index) => ({
                            ...item,
                            rank: index + 1,
                            trend: 'same',
                            rankChange: 0,
                          }))
                        );
                      }}
                    >
                      {dayjs(snapshot.timestamp).format('HH:mm DD/MM')}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            </Card>
          )}

          <p className="tp-source-note">
            {mode === 'tags'
              ? 'Nguồn: TeePublic Tag Directory. Thứ hạng phản ánh mức sử dụng tag, không phải số lượt tìm kiếm.'
              : `Nguồn: mục ${mode === 'best-sellers' ? 'Best Sellers' : 'Trending Today'} trên trang sản phẩm TeePublic. Dữ liệu gồm thứ hạng sản phẩm, Main Tag và tag liên quan.`}
          </p>
        </div>
      </main>
    </div>
  );
}
