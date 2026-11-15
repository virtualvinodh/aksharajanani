
import React from 'react';
import { AppSettings, FontMetrics } from '../../types';
import { useLocale } from '../../contexts/LocaleContext';
import { DEFAULT_FONT_VERSION, normalizeFontVersion } from '../../utils/fontVersion';

interface MetaDataSettingsProps {
    settings: AppSettings;
    onSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
    projectName: string;
    metrics: FontMetrics;
    onMetricsChange: React.Dispatch<React.SetStateAction<FontMetrics>>;
}

const MetaDataSettings: React.FC<MetaDataSettingsProps> = ({ settings, onSettingsChange, projectName, metrics, onMetricsChange }) => {
    const { t } = useLocale();

    const follows = settings.fontNameFollowsProject !== false; // missing means it follows

    const handleSettingChange = (key: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onSettingsChange(prev => ({
            ...prev,
            [key]: e.target.value
        }));
    };

    return (
        <div className="space-y-6">
             {/* Font Name moved from General */}
             <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                {/* The name people pick the font by in Word, Canva or on a phone (row 40). */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-grow min-w-0">
                        <label htmlFor="font-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fontNameLabel')}</label>
                        <input 
                            type="text" 
                            id="font-name"
                            value={follows ? (settings.fontName || projectName) : settings.fontName} 
                            onChange={handleSettingChange('fontName')} 
                            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 text-lg font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                    </div>
                    <div className="sm:w-40">
                        <label htmlFor="font-style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fontStyleLabel')}</label>
                        <input
                            type="text"
                            id="font-style"
                            value={metrics.styleName}
                            onChange={e => { const v = e.target.value; onMetricsChange(prev => ({ ...prev, styleName: v })); }}
                            onBlur={() => onMetricsChange(prev => prev.styleName?.trim() ? prev : { ...prev, styleName: 'Regular' })}
                            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 text-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                    </div>
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={follows}
                        onChange={e => { const on = e.target.checked; onSettingsChange(prev => ({ ...prev, fontNameFollowsProject: on, fontName: on ? (prev.fontName?.trim() && prev.fontName === projectName ? prev.fontName : projectName) : prev.fontName })); }}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                    />
                    {t('fontNameSameAsProject')}
                </label>
                <p className="text-xs text-gray-500 mt-1">{t(follows ? 'fontNameFollowsHint' : 'fontNameOwnHint')}</p>
                <label htmlFor="font-version" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-1">{t('fontVersionLabel')}</label>
                <input
                    type="text"
                    inputMode="decimal"
                    id="font-version"
                    value={settings.fontVersion ?? DEFAULT_FONT_VERSION}
                    onChange={handleSettingChange('fontVersion')}
                    onBlur={() => onSettingsChange(prev => ({ ...prev, fontVersion: normalizeFontVersion(prev.fontVersion) }))}
                    className="w-32 p-2 border rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">{t('fontVersionHint')}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">{t('authoringInformation')}</h4>
                <div>
                    <label htmlFor="font-manufacturer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetaManufacturer')}</label>
                    <input type="text" id="font-manufacturer" value={settings.manufacturer || ''} onChange={handleSettingChange('manufacturer')} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="font-designer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetaDesigner')}</label>
                    <input type="text" id="font-designer" value={settings.designer || ''} onChange={handleSettingChange('designer')} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="font-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetaDescription')}</label>
                    <textarea id="font-description" value={settings.description || ''} onChange={handleSettingChange('description')} rows={3} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm resize-y"/>
                </div>
                <div>
                    <label htmlFor="font-vendor-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetaVendorURL')}</label>
                    <input type="url" id="font-vendor-url" value={settings.vendorURL || ''} onChange={handleSettingChange('vendorURL')} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="font-designer-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetaDesignerURL')}</label>
                    <input type="url" id="font-designer-url" value={settings.designerURL || ''} onChange={handleSettingChange('designerURL')} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="font-license" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetaLicenseDescription')}</label>
                    <textarea id="font-license" value={settings.licenseDescription || ''} onChange={handleSettingChange('licenseDescription')} rows={3} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm resize-y"/>
                </div>
                <div>
                    <label htmlFor="font-license-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fontMetaLicenseURL')}</label>
                    <input type="url" id="font-license-url" value={settings.licenseInfoURL || ''} onChange={handleSettingChange('licenseInfoURL')} className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"/>
                </div>
            </div>
        </div>
    );
};

export default React.memo(MetaDataSettings);
