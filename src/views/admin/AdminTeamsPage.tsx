import React, { useEffect, useState } from 'react';
import { Building2, Edit2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Team } from '../../models/domain';
import { teamRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { ImageUploadField } from '../../components/shared/ImageUploadField';

type TeamFormState = {
  name: string;
  code: string;
  brandColor: string;
  accentColor: string;
  logoText: string;
  logo: string | null;
  contactEmail: string;
  contactPhone: string;
  address: string;
};

const emptyForm: TeamFormState = {
  name: '',
  code: '',
  brandColor: '#2563EB',
  accentColor: '#EFF6FF',
  logoText: '',
  logo: null,
  contactEmail: '',
  contactPhone: '',
  address: '',
};

const toForm = (team: Team): TeamFormState => ({
  name: team.name,
  code: team.code,
  brandColor: team.brandColor,
  accentColor: team.accentColor,
  logoText: team.logoText,
  logo: team.logo || null,
  contactEmail: team.contactEmail,
  contactPhone: team.contactPhone,
  address: team.address,
});

export const AdminTeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form, setForm] = useState<TeamFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTeams = async () => {
    setLoading(true);
    try {
      setTeams(await teamRepository.getAll());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const updateForm = <K extends keyof TeamFormState>(key: K, value: TeamFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openCreateDialog = () => {
    setEditingTeam(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setForm(toForm(team));
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.logoText.trim()) {
      toast.error('Name, code, and logo text are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        brandColor: form.brandColor,
        accentColor: form.accentColor,
        logoText: form.logoText.trim(),
        logo: form.logo,
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        address: form.address.trim(),
      };

      if (editingTeam) {
        await teamRepository.update(editingTeam.id, payload);
        toast.success(`Updated ${payload.name}`);
      } else {
        await teamRepository.create({ ...payload, isActive: true });
        toast.success(`Created ${payload.name}`);
      }

      setIsDialogOpen(false);
      await loadTeams();
    } catch (error: any) {
      toast.error(error.message || 'Unable to save team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Manage brand identity, contact details, and billing logos"
        actions={
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateDialog}>
            Add Team
          </Button>
        }
      />

      <div className="enterprise-table-container overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Branding</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teams.map((team) => (
              <tr key={team.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{team.name}</div>
                      <div className="font-mono text-xs text-slate-400">{team.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded border border-slate-200" style={{ backgroundColor: team.brandColor }} />
                    <span className="h-5 w-5 rounded border border-slate-200" style={{ backgroundColor: team.accentColor }} />
                    <span className="text-xs font-semibold text-slate-600">{team.logoText}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-600">
                  <div>{team.contactEmail}</div>
                  <div className="font-mono text-slate-400">{team.contactPhone}</div>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                    onClick={() => openEditDialog(team)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingTeam ? 'Edit Team' : 'Create Team'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUploadField
            label="Team Logo"
            value={form.logo}
            fallbackText={form.name || form.logoText || 'Team'}
            kind="logo"
            onChange={(logo) => updateForm('logo', logo)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Team Name *" value={form.name} onChange={(e) => updateForm('name', e.target.value)} required />
            <Input label="Code *" value={form.code} onChange={(e) => updateForm('code', e.target.value)} maxLength={10} required />
          </div>

          <Input label="Logo Text *" value={form.logoText} onChange={(e) => updateForm('logoText', e.target.value)} required />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Brand Color *" type="color" value={form.brandColor} onChange={(e) => updateForm('brandColor', e.target.value)} required />
            <Input label="Accent Color *" type="color" value={form.accentColor} onChange={(e) => updateForm('accentColor', e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Contact Email *" type="email" value={form.contactEmail} onChange={(e) => updateForm('contactEmail', e.target.value)} required />
            <Input label="Contact Phone *" value={form.contactPhone} onChange={(e) => updateForm('contactPhone', e.target.value)} required />
          </div>

          <Input label="Address *" value={form.address} onChange={(e) => updateForm('address', e.target.value)} required />

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingTeam ? 'Save Changes' : 'Create Team'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
