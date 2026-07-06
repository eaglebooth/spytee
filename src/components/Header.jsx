import { Layout } from 'antd';
import { Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './Header.css';

const { Header: AntHeader } = Layout;

const tabs = [
  { to: '/redbubble', label: 'Redbubble Trend' },
  { to: '/teepublic', label: 'Teepublic Trend' },
];

export default function Header() {
  return (
    <AntHeader className="sy-topbar">
      <div className="sy-brand">
        <div className="sy-brand-icon">
          <Search size={17} strokeWidth={2.5} />
        </div>
        <span className="sy-brand-text">
          SPY<span>TEE</span>
        </span>
      </div>
      <nav className="sy-tabs" aria-label="Trend platforms">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `sy-tab${isActive ? ' sy-tab-active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </AntHeader>
  );
}
