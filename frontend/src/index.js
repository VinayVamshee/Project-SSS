import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// Configure Global Axios Interceptor to rewrite URLs and inject Authorization header
axios.interceptors.request.use((config) => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost');
  const apiBase = isLocal ? 'http://localhost:3001' : 'http://localhost:3001';
  
  if (config.url && config.url.includes('http://localhost:3001')) {
    config.url = config.url.replace('http://localhost:3001', apiBase);
  } else if (config.url && !config.url.startsWith('http')) {
    config.url = `${apiBase}${config.url}`;
  }

  // Inject active JWT token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Inject x-tenant-slug dynamically based on subdomain or custom domain
  const host = window.location.hostname;
  const isSystemDomain = host.endsWith('.schooltechnosolution.com') || host.endsWith('.localhost') || host.endsWith('.vercel.app');
  
  if (isSystemDomain) {
    config.headers['x-tenant-slug'] = host.split('.')[0];
  } else if (host !== 'localhost' && host.includes('.')) {
    // Custom domain: Pass full host domain so the backend can resolve it
    config.headers['x-tenant-slug'] = host;
  } else {
    const schoolSlug = localStorage.getItem('schoolSlug');
    if (schoolSlug) {
      config.headers['x-tenant-slug'] = schoolSlug;
    } else {
      config.headers['x-tenant-slug'] = 'primary'; // Fallback to primary default school
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

const TenantAppBootstrapper = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const bootstrapTenant = async () => {
      try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost');
        const apiBase = isLocal ? 'http://localhost:3001' : 'http://localhost:3001';
        
        // Resolve tenant details
        const headers = {};
        const host = window.location.hostname;
        const isSystemDomain = host.endsWith('.schooltechnosolution.com') || host.endsWith('.localhost') || host.endsWith('.vercel.app');
        
        if (isSystemDomain) {
          headers['x-tenant-slug'] = host.split('.')[0];
        } else if (host !== 'localhost' && host.includes('.')) {
          headers['x-tenant-slug'] = host;
        } else {
          const schoolSlug = localStorage.getItem('schoolSlug');
          headers['x-tenant-slug'] = schoolSlug || 'primary';
        }
        
        const response = await axios.get(`${apiBase}/tenant-config`, { headers });
        const school = response.data;
        
        // Inject Theme styling dynamically matching style.css parameters
        const themePreset = school.theme?.themeName || 'light';
        document.documentElement.setAttribute('data-theme', themePreset);
        localStorage.setItem('theme', themePreset);
        
        document.title = school.name || 'School Scholastic System';


        
        // Save school config locally for components to read
        localStorage.setItem('schoolName', school.name);
        localStorage.setItem('schoolLogo', school.logoUrl || '');
        localStorage.setItem('schoolSlug', school.slug || '');
        
        setLoading(false);
      } catch (err) {
        console.error("Failed to load school tenant configuration", err);
        setError("This site cannot be resolved. Please verify the school link address.");
        setLoading(false);
      }
    };

    bootstrapTenant();
  }, []);


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h3>Loading School System Configurations...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', flexDirection: 'column' }}>
        <h2>Branding Configuration Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return <App />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TenantAppBootstrapper />
  </React.StrictMode>
);

reportWebVitals();

