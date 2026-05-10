import {
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChartColumn,
  CheckCircle2,
  CloudDownload,
  Home,
  LucideProps,
  Megaphone,
  Menu,
  Pencil,
  QrCode,
  School,
  Settings,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react-native';
import type { MenuItem } from '../types';

export const AppIcon = ({
  name,
  ...props
}: LucideProps & { name: MenuItem['icon'] | 'bell' | 'menu' }) => {
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
    menu: Menu,
  };
  const Icon = map[name];
  return <Icon {...props} />;
};
