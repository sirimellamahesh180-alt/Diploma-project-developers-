import { guardRequest } from '@/lib/security';
import {createAdminClient} from '@/lib/supabase/admin';import {requestSchema} from '@/lib/validation';import {notifyOwner,safeEmailHtml,sendEmail} from '@/lib/email';import {jsonError} from '@/lib/utils';
import { verifyTurnstile } from '@/lib/turnstile';
export async function GET(){return jsonError('Not found.',404)}
export async function POST(req:Request){const blocked=await guardRequest(req,'project-request',5,3600);if(blocked)return blocked;try{const raw=await req.json();if(raw.company)return Response.json({ok:true});if(!(await verifyTurnstile(raw.turnstileToken, req, 'project_request')))return jsonError('Human verification failed. Please complete the security check again.', 403);const parsed=requestSchema.safeParse(raw);if(!parsed.success)return jsonError(parsed.error.issues[0]?.message||'Please check your details.');const db=createAdminClient();const {data,error}=await db.from('project_requests').insert({name:parsed.data.name,email:parsed.data.email.toLowerCase(),phone:parsed.data.phone,category:parsed.data.category,title:parsed.data.title,description:parsed.data.description,budget_inr:parsed.data.budget,payment_preference:parsed.data.paymentPreference,status:'pending'}).select('id,created_at').single();if(error)throw error;const summary=`A new project request was submitted.
Reference: ${data.id}
Name: ${parsed.data.name}
Email: ${parsed.data.email}
Phone: ${parsed.data.phone}
Project: ${parsed.data.title}
Category: ${parsed.data.category}
Budget: INR ${parsed.data.budget}`;const results=await Promise.allSettled([notifyOwner('New project request received',safeEmailHtml('New project request',summary)),sendEmail({to:parsed.data.email,subject:'We received your project request',html:safeEmailHtml('Thank you for contacting us',`Hello ${parsed.data.name},\nWe received your request for ${parsed.data.title}. Our team will review it and contact you.\nReference: ${data.id}`)})]);if(results.some(x=>x.status==='rejected'))console.error('Request email delivery failed',results.filter(x=>x.status==='rejected'));return Response.json({id:data.id,createdAt:data.created_at},{status:201});}catch(e){console.error(e);return jsonError('We could not save your request. Please try again.',500)}}
