"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const Map = dynamic(() => import('./mapbox-map'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
      <div className="text-center">
        <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2 animate-spin" />
        <p className="text-slate-600 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

interface CheckInFormData {
  workerId: string;
  jobType: string;
  otherJob?: string;
  locationType: string;
  department: string;
  notes: string;
}

type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

export function CheckInWidget() {
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckInFormData>({
    mode: 'onChange',
    defaultValues: {
      workerId: '',
      jobType: '',
      otherJob: '',
      locationType: '',
      department: '',
      notes: '',
    },
  });

  const jobType = watch('jobType');
  const locationType = watch('locationType');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationStatus('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('granted');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
          return;
        }
        setLocationStatus('unavailable');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateDateTime = () => {
      const now = new Date();

      setCurrentDate(
        now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );

      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );

    };

    updateDateTime();
    const interval = window.setInterval(updateDateTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const getLocationStatusIcon = () => {
    switch (locationStatus) {
      case 'granted':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'denied':
        return <AlertCircle className="h-5 w-5" />;
      case 'loading':
        return <Clock className="h-5 w-5 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getLocationStatusText = () => {
    switch (locationStatus) {
      case 'granted':
        return 'Location verified';
      case 'denied':
        return 'Location access denied';
      case 'loading':
        return 'Getting your location...';
      default:
        return 'Location unavailable';
    }
  };

  const onSubmit = (data: CheckInFormData) => {
    if (locationStatus !== 'granted' || !userLocation) {
      toast.error('Location permission required to check in');
      return;
    }

    const payload = {
      workerId: data.workerId,
      jobType: data.jobType,
      otherJob: data.jobType === 'Other' ? data.otherJob : undefined,
      locationType: data.locationType,
      department: data.department,
      notes: data.notes || undefined,
      location: userLocation,
      timestamp: new Date().toISOString(),
    };

    console.log('[Check-In Submission]', JSON.stringify(payload, null, 2));
    toast.success('Successfully checked in!');
  };

  const isSubmitDisabled = locationStatus !== 'granted' || !userLocation;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Employee Check-In</h1>
          <p className="text-slate-600">Verify your location and check in for your shift</p>
        </div>

        <div className="mb-6 shadow-md">
          <Map userLocation={userLocation} locationStatus={locationStatus} />
        </div>

        <div
          className={`mb-6 flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-all ${
            locationStatus === 'granted'
              ? 'bg-green-50 text-green-900 border border-green-200'
              : locationStatus === 'loading'
                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {getLocationStatusIcon()}
          <span>{getLocationStatusText()}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-sm text-slate-600 font-medium">Date</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{currentDate || '—'}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-sm text-slate-600 font-medium">Time</p>
            <p className="text-lg font-semibold text-slate-900 mt-1 font-mono">{currentTime || '—'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Worker ID <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Enter your worker ID"
              {...register('workerId', { required: 'Worker ID is required' })}
              className="w-full"
            />
            {errors.workerId && <p className="mt-1 text-xs text-red-600">{errors.workerId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Type of Job <span className="text-red-500">*</span>
            </label>
            <select
              {...register('jobType', { required: 'Job Type is required' })}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select a job type</option>
              <option value="Housekeeping">Housekeeping</option>
              <option value="Worker">Worker</option>
              <option value="Idle">Idle</option>
              <option value="Other">Other</option>
            </select>
            {errors.jobType && <p className="mt-1 text-xs text-red-600">{errors.jobType.message}</p>}
          </div>

          {jobType === 'Other' && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Specify Job Type <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter job type"
                {...register('otherJob', {
                  required: jobType === 'Other' ? 'Please specify the job type' : false,
                })}
                className="w-full"
              />
              {errors.otherJob && <p className="mt-1 text-xs text-red-600">{errors.otherJob.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Location Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <label
                className="flex-1 rounded-lg border-2 px-4 py-3 text-center font-semibold transition-all cursor-pointer"
                style={{
                  borderColor: locationType === 'Inside' ? '#3b82f6' : '#cbd5e1',
                  backgroundColor: locationType === 'Inside' ? '#eff6ff' : '#ffffff',
                  color: locationType === 'Inside' ? '#1e3a8a' : '#475569',
                }}
              >
                <input
                  type="radio"
                  value="Inside"
                  {...register('locationType', { required: 'Location type is required' })}
                  className="sr-only"
                />
                Inside Facility
              </label>
              <label
                className="flex-1 rounded-lg border-2 px-4 py-3 text-center font-semibold transition-all cursor-pointer"
                style={{
                  borderColor: locationType === 'Outside' ? '#3b82f6' : '#cbd5e1',
                  backgroundColor: locationType === 'Outside' ? '#eff6ff' : '#ffffff',
                  color: locationType === 'Outside' ? '#1e3a8a' : '#475569',
                }}
              >
                <input
                  type="radio"
                  value="Outside"
                  {...register('locationType', { required: 'Location type is required' })}
                  className="sr-only"
                />
                Outside Facility
              </label>
            </div>
            {errors.locationType && <p className="mt-1 text-xs text-red-600">{errors.locationType.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              {...register('department', { required: 'Department is required' })}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select a department</option>
              <option value="Designer">Designer</option>
              <option value="Analytic">Analytic</option>
              <option value="Accounting">Accounting</option>
              <option value="Supply Chain">Supply Chain</option>
              <option value="CEO">CEO</option>
              <option value="Operational">Operational</option>
              <option value="Sale">Sale</option>
              <option value="Production">Production</option>
              <option value="Quality">Quality</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Logistics">Logistics</option>
            </select>
            {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Notes <span className="text-slate-500">(Optional)</span>
            </label>
            <Textarea
              placeholder="Add any additional notes..."
              {...register('notes')}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-lg transition-all ${
                isSubmitDisabled
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg hover:shadow-xl'
              }`}
            >
              {locationStatus !== 'granted' ? 'Enable Location to Check In' : 'Check In'}
            </button>
            {locationStatus === 'denied' && (
              <p className="text-xs text-red-600 mt-3 text-center">
                Location permission is required. Please enable location access in your browser settings.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
