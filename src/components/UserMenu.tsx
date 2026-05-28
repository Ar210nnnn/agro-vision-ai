import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User as UserIcon, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const UserMenu = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    supabase.from('profiles').select('display_name, avatar_url').eq('user_id', user.id).maybeSingle().then(({ data }) => setProfile(data));
  }, [user]);

  if (!user) {
    return (
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/auth')}>
        <LogIn className="w-3.5 h-3.5" /> Entrar
      </Button>
    );
  }

  const name = profile?.display_name || user.email?.split('@')[0] || 'Usuario';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:bg-muted/50 rounded-full pr-3 pl-1 py-1 transition-colors">
          <Avatar className="w-7 h-7 ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] font-bold gradient-hero text-white">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium hidden sm:block max-w-[100px] truncate">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs">
          <p className="font-medium truncate">{name}</p>
          <p className="text-[10px] text-muted-foreground truncate font-normal">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <UserIcon className="w-4 h-4 mr-2" /> Mi perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/')}>
          <BookOpen className="w-4 h-4 mr-2" /> Mis análisis
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive">
          <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
