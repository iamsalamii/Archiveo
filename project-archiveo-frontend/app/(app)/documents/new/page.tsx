'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ParameterSelect } from '@/components/shared/parameter-select';
import { useI18n } from '@/contexts/i18n-context';
import { createDocument } from '@/services/documents-api';
import { toast } from 'sonner';
import type { GedDocument } from '@/types';
import { FileText, ArrowLeft, Save, Upload } from 'lucide-react';

export default function DocumentFormPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [form, setForm] = useState<Partial<GedDocument>>({
    reference: `DOC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    title: '',
    description: '',
    typeId: '',
    categoryId: '',
    subCategoryId: '',
    serviceId: '',
    directionId: '',
    languageId: 'FR',
    formatId: 'PDF',
    supportId: 'NUMERIQUE',
    confidentialityId: 'INTERNE',
    securityLevelId: 'SEC_MED',
    statusId: 'BROUILLON',
    priorityId: 'PRIO_MED',
    tags: [],
    keywords: [],
  });

  const set = (key: keyof GedDocument, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!form.title || !form.typeId || !form.categoryId || !form.serviceId) {
      toast.error('Veuillez renseigner les champs obligatoires (Titre, Type, Catégorie, Service)');
      return;
    }
    setSaving(true);
    try {
      await createDocument(
        {
          title: form.title,
          description: form.description,
          typeId: form.typeId,
          categoryId: form.categoryId,
          subCategoryId: form.subCategoryId,
          serviceId: form.serviceId,
          confidentialityId: form.confidentialityId,
          languageId: form.languageId,
          retentionYears: 10,
          tags: Array.isArray(form.tags) ? form.tags.join(',') : form.tags,
          keywords: Array.isArray(form.keywords) ? form.keywords.join(',') : form.keywords,
        },
        file || undefined
      );
      toast.success('Document créé et enregistré dans la base de données');
      router.push('/documents');
    } catch (error) {
      // Fallback
      console.error('Erreur API création document, fallback local:', error);
      toast.error((error as Error).message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/documents')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title={t('docs.new')} icon={<FileText className="h-6 w-6" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General */}
        <Card>
          <CardHeader><CardTitle>{t('docs.general')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('docs.reference')} <span className="text-destructive">*</span></Label>
              <Input value={form.reference} onChange={(e) => set('reference', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('docs.title_field')} <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fichier joint (PDF, document, image)</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file && <p className="text-xs text-muted-foreground">Fichier sélectionné : {file.name}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader><CardTitle>{t('docs.classification')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('docs.type')}</Label>
                <ParameterSelect groupCode="DOC_TYPE" value={form.typeId as string} onValueChange={(v) => set('typeId', v)} />
              </div>
              <div className="space-y-2">
                <Label>{t('docs.category')}</Label>
                <ParameterSelect groupCode="CATEGORY" value={form.categoryId as string} onValueChange={(v) => set('categoryId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Sous-catégorie</Label>
                <ParameterSelect groupCode="SUB_CATEGORY" value={form.subCategoryId as string} onValueChange={(v) => set('subCategoryId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <ParameterSelect groupCode="SERVICE" value={form.serviceId as string} onValueChange={(v) => set('serviceId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <ParameterSelect groupCode="DIRECTION" value={form.directionId as string} onValueChange={(v) => set('directionId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Département</Label>
                <ParameterSelect groupCode="DEPARTMENT" value={form.departmentId as string} onValueChange={(v) => set('departmentId', v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader><CardTitle>{t('docs.metadata')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Langue</Label>
                <ParameterSelect groupCode="LANGUAGE" value={form.languageId as string} onValueChange={(v) => set('languageId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <ParameterSelect groupCode="FORMAT" value={form.formatId as string} onValueChange={(v) => set('formatId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Support</Label>
                <ParameterSelect groupCode="SUPPORT_TYPE" value={form.supportId as string} onValueChange={(v) => set('supportId', v)} />
              </div>
              <div className="space-y-2">
                <Label>État physique</Label>
                <ParameterSelect groupCode="PHYSICAL_STATE" value={form.physicalStateId as string} onValueChange={(v) => set('physicalStateId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Auteur</Label>
                <ParameterSelect groupCode="AUTHOR" value={form.authorId as string} onValueChange={(v) => set('authorId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Producteur</Label>
                <ParameterSelect groupCode="PRODUCER" value={form.producerId as string} onValueChange={(v) => set('producerId', v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confidentiality & Lifecycle */}
        <Card>
          <CardHeader><CardTitle>{t('docs.confidentiality')} & {t('docs.lifecycle')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Confidentialité</Label>
                <ParameterSelect groupCode="CONFIDENTIALITY" value={form.confidentialityId as string} onValueChange={(v) => set('confidentialityId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Niveau de sécurité</Label>
                <ParameterSelect groupCode="SECURITY_LEVEL" value={form.securityLevelId as string} onValueChange={(v) => set('securityLevelId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <ParameterSelect groupCode="DOC_STATUS" value={form.statusId as string} onValueChange={(v) => set('statusId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <ParameterSelect groupCode="PRIORITY" value={form.priorityId as string} onValueChange={(v) => set('priorityId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Type d'archives</Label>
                <ParameterSelect groupCode="ARCHIVE_TYPE" value={form.archiveTypeId as string} onValueChange={(v) => set('archiveTypeId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Durée de conservation</Label>
                <ParameterSelect groupCode="RETENTION" value={form.retentionId as string} onValueChange={(v) => set('retentionId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Sort final</Label>
                <ParameterSelect groupCode="FINAL_SORT" value={form.finalSortId as string} onValueChange={(v) => set('finalSortId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Type de classement</Label>
                <ParameterSelect groupCode="CLASSIFICATION" value={form.classificationId as string} onValueChange={(v) => set('classificationId', v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle>{t('docs.location')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Site</Label>
                <ParameterSelect groupCode="SITE" value={form.siteId as string} onValueChange={(v) => set('siteId', v)} />
              </div>
              <div className="space-y-2">
                <Label>Agence</Label>
                <ParameterSelect groupCode="AGENCY" value={form.agencyId as string} onValueChange={(v) => set('agencyId', v)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Localisation</Label>
                <ParameterSelect groupCode="LOCATION" value={form.locationId as string} onValueChange={(v) => set('locationId', v)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/documents')}>{t('common.cancel')}</Button>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Enregistrement...' : t('common.save')}
        </Button>
      </div>
    </div>
  );
}
