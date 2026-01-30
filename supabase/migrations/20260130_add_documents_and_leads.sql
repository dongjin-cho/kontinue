-- =====================================================
-- Step3: Documents and Leads tables
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Documents table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    run_id UUID, -- Optional: link to a specific valuation run
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded' 
        CHECK (status IN ('uploaded', 'parsing', 'parsed', 'verified', 'failed')),
    extracted_json JSONB,
    verified_json JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Leads table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    
    -- Contact information
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    contact_message TEXT,
    
    -- Consent
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    consent_given_at TIMESTAMPTZ,
    
    -- Valuation summary (from Step1/Step2)
    step1_summary JSONB,
    step2_summary JSONB,
    financial_summary JSONB, -- From verified/extracted document
    
    -- Broker webhook
    broker_payload JSONB,
    sent_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (sent_status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    send_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_sent_status ON public.leads(sent_status);

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for webhooks (uses service_role key)
DROP POLICY IF EXISTS "Service role full access to documents" ON public.documents;
CREATE POLICY "Service role full access to documents" ON public.documents
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Leads policies
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
CREATE POLICY "Users can view own leads" ON public.leads
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
CREATE POLICY "Users can insert own leads" ON public.leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
CREATE POLICY "Users can update own leads" ON public.leads
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- Storage bucket for documents (run in Supabase Dashboard)
-- =====================================================
-- Note: Storage policies are typically set via Supabase Dashboard
-- Bucket name: documents (private)
-- Policy: Users can upload to users/{userId}/* path
-- 
-- INSERT policy:
--   (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
-- 
-- SELECT policy:
--   (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
-- 
-- DELETE policy:
--   (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
