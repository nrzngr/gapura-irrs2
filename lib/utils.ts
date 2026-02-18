import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isDemoMode() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('demo_mode') === 'true' || 
           new URLSearchParams(window.location.search).get('demo') === '1';
}

export async function fetchWithDemo(url: string, options: RequestInit = {}) {
    const isDemo = isDemoMode();
    const headers = new Headers(options.headers);
    
    if (isDemo) {
        headers.set('x-demo', 'true');
    }
    
    return fetch(url, {
        ...options,
        headers,
    });
}
