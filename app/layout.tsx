import type { Metadata } from 'next';import './globals.css';import {Plus_Jakarta_Sans} from 'next/font/google';import {ToastProvider} from '@/components/ToastProvider';
const font=Plus_Jakarta_Sans({subsets:['latin'],variable:'--font-jakarta'});
export const metadata:Metadata={title:'Diploma Project Developers',description:'Project development, engineering and innovation studio.',metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000')};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={font.variable}><ToastProvider>{children}</ToastProvider></body></html>}
