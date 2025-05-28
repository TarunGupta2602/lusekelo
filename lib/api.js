// lib/api.js
export async function fetchData(endpoint) {
    const res = await fetch(`/api/${endpoint}`);
    if (!res.ok) throw new Error('Failed to fetch data');
    return res.json();
  }
  