const USERDATA_API = localStorage.getItem('promo-track-userdata-api') || 'https://t8b50k0lwh.execute-api.eu-west-1.amazonaws.com/prod';

export async function loadUserData(userId: string): Promise<any | null> {
  const res = await fetch(`${USERDATA_API}/userdata/${userId}`);
  if (!res.ok) throw new Error('Failed to load user data');
  const { data } = await res.json();
  return data;
}

export async function saveUserData(userId: string, data: any): Promise<void> {
  await fetch(`${USERDATA_API}/userdata/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
