const paths = {
  leaf: <><path d="M20 4c-7-1-15 1-15 8a6 6 0 0 0 6 6c7 0 9-7 9-14Z" /><path d="m4 21 10-10" /></>,
  droplets: <><path d="M8 3S3 9 3 12a5 5 0 0 0 10 0c0-3-5-9-5-9Z" /><path d="M17 7s4 5 4 8a4 4 0 0 1-6 3.5" /></>,
  temperature: <><path d="M9 14.8V5a3 3 0 0 1 6 0v9.8a5 5 0 1 1-6 0Z" /><path d="M12 9v9" /></>,
  humidity: <><path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z" /><path d="m9 17 6-6M9 11h.01M15 17h.01" /></>,
  pump: <><path d="M12 2v9M6 5a9 9 0 1 0 12 0" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 7a8 8 0 0 1 13-2L20 7M4 17l1.5 2a8 8 0 0 0 13-2" /></>,
  cloud: <path d="M7 18a5 5 0 1 1 .5-10A7 7 0 0 1 21 11a3.5 3.5 0 0 1-1 7Z" />,
  network: <><path d="M3 9a15 15 0 0 1 18 0M6 13a10 10 0 0 1 12 0M9 17a5 5 0 0 1 6 0" /><path d="M12 21h.01" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  gauge: <><path d="M4 18a9 9 0 1 1 16 0Z" /><path d="m12 13 4-5" /><circle cx="12" cy="13" r="1" /></>,
  valve: <><path d="M3 10h5l8 6h5V8h-5l-8 6H3ZM12 11V4M8 4h8" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  chart: <><path d="M3 3v18h18M7 15l4-5 4 3 5-7" /></>,
  alert: <><path d="m12 3 10 18H2Z" /><path d="M12 9v5M12 18h.01" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
  database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" /></>,
  check: <polyline points="20 6 9 17 4 12" />,
};
export default function Icon({ name, className = '' }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.leaf}</svg>;
}
