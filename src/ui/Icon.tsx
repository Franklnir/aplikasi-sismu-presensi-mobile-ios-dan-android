import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChartColumn,
  CheckCircle2,
  CloudDownload,
  Eye,
  EyeOff,
  Globe2,
  Home,
  LockKeyhole,
  LucideProps,
  Megaphone,
  Menu,
  Pencil,
  QrCode,
  School,
  Search,
  Settings,
  ShieldCheck,
  LogIn,
  User,
  Users,
} from 'lucide-react-native';
import type { MenuItem } from '../types';

export const AppIcon = ({
  name,
  ...props
}: LucideProps & {
  name:
    | MenuItem['icon']
    | 'bell'
    | 'eye'
    | 'eyeOff'
    | 'globe'
    | 'lock'
    | 'login'
    | 'menu'
    | 'search';
}) => {
  const map = {
    home: Home,
    calendar: CalendarDays,
    book: BookOpen,
    brain: Brain,
    pencil: Pencil,
    user: User,
    chart: ChartColumn,
    school: School,
    users: Users,
    settings: Settings,
    shield: ShieldCheck,
    megaphone: Megaphone,
    check: CheckCircle2,
    backup: CloudDownload,
    scan: QrCode,
    bell: Bell,
    eye: Eye,
    eyeOff: EyeOff,
    globe: Globe2,
    lock: LockKeyhole,
    login: LogIn,
    menu: Menu,
    search: Search,
  };
  const Icon = map[name];
  return <Icon {...props} />;
};
