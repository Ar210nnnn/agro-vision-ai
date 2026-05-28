import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, User as UserIcon, MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ display_name: '', avatar_url: '', location_name: '', bio: '' });

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!user) return;
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile({
        display_name: data.display_name ?? '',
        avatar_url: data.avatar_url ?? '',
        location_name: data.location_name ?? '',
        bio: data.bio ?? '',
      });
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update(profile).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error('No se pudo guardar');
    else toast.success('Perfil actualizado');
  };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const initials = (profile.display_name || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <header className="sticky top-0 z-50 border-b border-border/40 glass">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="font-bold">Mi perfil</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-soft space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 ring-2 ring-primary/20">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-lg font-bold gradient-hero text-white">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{profile.display_name || 'Sin nombre'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="dn"><UserIcon className="w-3 h-3 inline mr-1" /> Nombre para mostrar</Label>
            <Input id="dn" value={profile.display_name} onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="av">URL del avatar</Label>
            <Input id="av" value={profile.avatar_url} onChange={(e) => setProfile(p => ({ ...p, avatar_url: e.target.value }))} className="mt-1" placeholder="https://..." />
          </div>

          <div>
            <Label htmlFor="lo"><MapPin className="w-3 h-3 inline mr-1" /> Ubicación / Finca</Label>
            <Input id="lo" value={profile.location_name} onChange={(e) => setProfile(p => ({ ...p, location_name: e.target.value }))} className="mt-1" placeholder="Mi finca, Patio trasero..." />
          </div>

          <div>
            <Label htmlFor="bi">Bio</Label>
            <Textarea id="bi" value={profile.bio} onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))} className="mt-1" rows={3} placeholder="Cuéntanos sobre tus cultivos..." />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Profile;
