import { 
  Home, 
  Utensils, 
  Film, 
  Car, 
  Zap, 
  ShoppingBag, 
  Heart, 
  TrendingUp, 
  HelpCircle,
  Coins
} from 'lucide-react';

export interface CategoryInfo {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: any;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  Housing: {
    name: 'Housing',
    color: '#3b82f6', // blue-500
    bgColor: 'bg-blue-50/70',
    borderColor: 'border-blue-200',
    icon: Home
  },
  Food: {
    name: 'Food',
    color: '#eab308', // yellow-500
    bgColor: 'bg-yellow-50/70',
    borderColor: 'border-yellow-200',
    icon: Utensils
  },
  Entertainment: {
    name: 'Entertainment',
    color: '#a855f7', // purple-500
    bgColor: 'bg-purple-50/70',
    borderColor: 'border-purple-200',
    icon: Film
  },
  Transport: {
    name: 'Transport',
    color: '#14b8a6', // teal-500
    bgColor: 'bg-teal-50/70',
    borderColor: 'border-teal-200',
    icon: Car
  },
  Utilities: {
    name: 'Utilities',
    color: '#f97316', // orange-500
    bgColor: 'bg-orange-50/70',
    borderColor: 'border-orange-200',
    icon: Zap
  },
  Shopping: {
    name: 'Shopping',
    color: '#ec4899', // pink-500
    bgColor: 'bg-pink-50/70',
    borderColor: 'border-pink-200',
    icon: ShoppingBag
  },
  Healthcare: {
    name: 'Healthcare',
    color: '#ef4444', // red-500
    bgColor: 'bg-red-50/70',
    borderColor: 'border-red-200',
    icon: Heart
  },
  Savings: {
    name: 'Savings',
    color: '#22c55e', // green-500
    bgColor: 'bg-green-50/70',
    borderColor: 'border-green-200',
    icon: TrendingUp
  },
  Income: {
    name: 'Income',
    color: '#10b981', // emerald-500
    bgColor: 'bg-emerald-5/70',
    borderColor: 'border-emerald-200',
    icon: Coins
  },
  Other: {
    name: 'Other',
    color: '#6b7280', // gray-500
    bgColor: 'bg-gray-50/70',
    borderColor: 'border-gray-200',
    icon: HelpCircle
  }
};
