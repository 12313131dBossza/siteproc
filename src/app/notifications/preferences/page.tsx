'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Mail, Smartphone } from 'lucide-react';
import Link from 'next/link';

interface NotificationPreferences {
  id: string;
  email_order_approved: boolean;
  email_order_rejected: boolean;
  email_expense_approved: boolean;
  email_expense_rejected: boolean;
  email_delivery_confirmed: boolean;
  email_budget_warning: boolean;
  email_budget_exceeded: boolean;
  app_order_approved: boolean;
  app_order_rejected: boolean;
  app_expense_approved: boolean;
  app_expense_rejected: boolean;
  app_delivery_confirmed: boolean;
  app_budget_warning: boolean;
  app_budget_exceeded: boolean;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({})
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    try {
      const updated = { ...preferences, [key]: value };
      setPreferences(updated);

      const { error } = await supabase
        .from('notification_preferences')
        .update({ [key]: value })
        .eq('id', preferences.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      fetchPreferences(); // Revert on error
    }
  };

  const saveAll = async () => {
    if (!preferences) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('notification_preferences')
        .update(preferences)
        .eq('id', preferences.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return <div>Error loading preferences</div>;
  }

  const notificationTypes = [
    { key: 'order_approved', label: 'Order Approved', description: 'When a purchase order is approved' },
    { key: 'order_rejected', label: 'Order Rejected', description: 'When a purchase order is rejected' },
    { key: 'expense_approved', label: 'Expense Approved', description: 'When an expense is approved' },
    { key: 'expense_rejected', label: 'Expense Rejected', description: 'When an expense is rejected' },
    { key: 'delivery_confirmed', label: 'Delivery Confirmed', description: 'When a delivery is confirmed' },
    { key: 'budget_warning', label: 'Budget Warning', description: 'When budget reaches 80% utilization' },
    { key: 'budget_exceeded', label: 'Budget Exceeded', description: 'When budget is exceeded' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/notifications" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
          ← Back to Notifications
        </Link>
        <h1 className="text-3xl font-bold">Notification Preferences</h1>
        <p className="text-gray-600 mt-1">Manage how you receive notifications</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">
          <div>Event Type</div>
          <div className="flex items-center gap-2 justify-center">
            <Mail className="h-4 w-4" />
            Email
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Smartphone className="h-4 w-4" />
            In-App
          </div>
        </div>

        {/* Preferences List */}
        <div className="divide-y divide-gray-200">
          {notificationTypes.map((type) => (
            <div key={type.key} className="grid grid-cols-3 gap-4 p-4 items-center hover:bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{type.label}</p>
                <p className="text-sm text-gray-500">{type.description}</p>
              </div>
              <div className="flex justify-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences[`email_${type.key}` as keyof NotificationPreferences] as boolean}
                    onChange={(e) => updatePreference(`email_${type.key}` as keyof NotificationPreferences, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex justify-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences[`app_${type.key}` as keyof NotificationPreferences] as boolean}
                    onChange={(e) => updatePreference(`app_${type.key}` as keyof NotificationPreferences, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">About Notifications</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Email notifications</strong> are sent to your registered email address</li>
              <li>• <strong>In-app notifications</strong> appear in the notification bell and on this page</li>
              <li>• Changes are saved automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
