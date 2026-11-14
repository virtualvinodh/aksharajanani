import React, { useState, useRef, useEffect } from 'react';
import { Tool, AppSettings, Path, Character, TransformState } from '../types';
import { EditPointsIcon, PenIcon, EraserIcon, LineIcon, CircleIcon, DotIcon, UndoIcon, RedoIcon, CurveIcon, SelectIcon, ZoomInIcon, ZoomOutIcon, PanIcon, ImageIcon, CutIcon, CopyIcon, PasteIcon, EllipseIcon, CalligraphyIcon, GroupIcon, UngroupIcon, SliceIcon, CameraIcon, FitViewIcon, MoreIcon } from '../constants';
import { useLocale } from '../contexts/LocaleContext';
import { useFitColumns } from '../hooks/useFitColumns';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { COMPACT_TOOLBAR_QUERY } from './drawing/compactToolbar';

interface DrawingToolbarProps {
  character: Character;
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  settings: AppSettings;
  isLargeScreen: boolean;

  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;

  onCut: () => void;
  selectedPathIds: Set<string>;
  onCopy: () => void;
  onPaste: () => void;
  clipboard: Path[] | null;
  onGroup: () => void;
  canGroup: boolean;
  onUngroup: () => void;
  canUngroup: boolean;

  onZoom: (factor: number) => void;
  onFitView: () => void;
  onImageImportClick: () => void;
  onSvgImportClick: () => void;
  onImageTraceClick: () => void;

  calligraphyAngle: 45 | 30 | 15;
  setCalligraphyAngle: (angle: 45 | 30 | 15) => void;

  onApplyTransform: (transform: TransformState & { flipX?: boolean; flipY?: boolean }) => void;
  previewTransform: TransformState | null;
  setPreviewTransform: (transform: TransformState | null) => void;
}

const ToolButton: React.FC<{ tool: Tool, currentTool: Tool, label: string, onClick: (tool: Tool) => void, children: React.ReactNode, disabled?: boolean, dataTour?: string }> = React.memo(({ tool, currentTool, label, onClick, children, disabled = false, dataTour }) => {
  const isActive = currentTool === tool;
  return (
    <button
      onClick={() => onClick(tool)}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      data-tour={dataTour}
      className={`p-2 rounded-lg transition-all shadow-sm ${
        isActive
          ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30'
          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
      } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
    >
      {/* Fix: Casting children to React.ReactElement with explicit prop type for cloneElement */}
      {React.cloneElement(children as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
    </button>
  );
});
ToolButton.displayName = 'ToolButton';

const ActionButton: React.FC<{ onClick: () => void, title: string, disabled?: boolean, children: React.ReactNode, dataTour?: string }> = React.memo(({ onClick, title, disabled, children, dataTour }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    disabled={disabled}
    data-tour={dataTour}
    className="p-2 rounded-lg transition-all bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
  >
    {/* Fix: Casting children to React.ReactElement with explicit prop type for cloneElement */}
    {React.cloneElement(children as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
  </button>
));
ActionButton.displayName = 'ActionButton';

/** A tool with its name under the icon (phones: there is no hover to show names). */
const NamedButton: React.FC<{ label: string, icon: React.ReactNode, onClick: () => void, active?: boolean, disabled?: boolean, dataTour?: string, ariaLabel?: string, ariaExpanded?: boolean }> = ({ label, icon, onClick, active, disabled, dataTour, ariaLabel, ariaExpanded }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    data-tour={dataTour}
    aria-label={ariaLabel}
    aria-pressed={ariaExpanded === undefined ? active : undefined}
    aria-expanded={ariaExpanded}
    className={`flex-1 min-h-[52px] min-w-0 px-0.5 py-1.5 rounded-lg flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
      active ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6 flex-shrink-0' })}
    <span className="text-[10.5px] leading-tight text-center w-full break-normal">{label}</span>
  </button>
);

const DrawingToolbar: React.FC<DrawingToolbarProps> = (props) => {
    const { t } = useLocale();
    const { character, currentTool, setCurrentTool, isLargeScreen, onUndo, canUndo, onRedo, canRedo, onCut, selectedPathIds, onCopy, onPaste, clipboard, onGroup, canGroup, onUngroup, canUngroup, onZoom, onFitView, onImageImportClick, onSvgImportClick, onImageTraceClick, calligraphyAngle, setCalligraphyAngle } = props;

    const [isAnglePickerOpen, setIsAnglePickerOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const calligraphyToolButtonRef = useRef<HTMLDivElement>(null);
    const isLocked = !!character.link;
    const isCompact = useMediaQuery(COMPACT_TOOLBAR_QUERY) && !isLargeScreen;
    // Side toolbar: widen to more columns instead of running past the canvas on short screens.
    const sideToolbarRef = useFitColumns<HTMLDivElement>(2, 5, isLargeScreen);

    useEffect(() => {
        if (currentTool !== 'calligraphy') {
            setIsAnglePickerOpen(false);
        }
    }, [currentTool]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isAnglePickerOpen && calligraphyToolButtonRef.current && !calligraphyToolButtonRef.current.contains(event.target as Node)) {
                setIsAnglePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAnglePickerOpen]);

    useEffect(() => {
        if (!isMoreOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMoreOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isMoreOpen]);

    const handleCalligraphyToolClick = () => {
        if (currentTool === 'calligraphy') {
            setIsAnglePickerOpen(prev => !prev);
        } else {
            setCurrentTool('calligraphy');
            setIsAnglePickerOpen(false);
        }
    };

    if (isCompact) {
        // Phones: five tools with names, the rest under "More tools".
        type Item = { key: string; label: string; icon: React.ReactNode; onClick: () => void; tool?: Tool; disabled?: boolean; dataTour?: string; keepOpen?: boolean };
        const toolItem = (tool: Tool, label: string, icon: React.ReactNode, dataTour?: string, disabled = false): Item =>
            ({ key: tool, label, icon, tool, disabled, dataTour, onClick: () => setCurrentTool(tool) });
        const moreItems: Item[] = [
            toolItem('edit', t('edit'), <EditPointsIcon />, 'tool-edit'),
            toolItem('pan', t('pan'), <PanIcon />, 'tool-pan'),
            toolItem('calligraphy', t('calligraphyPen'), <CalligraphyIcon />, 'tool-calligraphy', isLocked),
            toolItem('line', t('line'), <LineIcon />, 'tool-line', isLocked),
            toolItem('curve', t('curve'), <CurveIcon />, undefined, isLocked),
            toolItem('circle', t('circle'), <CircleIcon />, undefined, isLocked),
            toolItem('ellipse', t('ellipse'), <EllipseIcon />, undefined, isLocked),
            toolItem('dot', t('dot'), <DotIcon />, undefined, isLocked),
            toolItem('slice', t('slice'), <SliceIcon />, 'tool-slice', isLocked),
            { key: 'cut', label: t('cut'), icon: <CutIcon />, onClick: onCut, disabled: selectedPathIds.size === 0 || isLocked, dataTour: 'action-cut' },
            { key: 'copy', label: t('copy'), icon: <CopyIcon />, onClick: onCopy, disabled: isLocked, dataTour: 'action-copy' },
            { key: 'paste', label: t('paste'), icon: <PasteIcon />, onClick: onPaste, disabled: !clipboard || isLocked, dataTour: 'action-paste' },
            { key: 'group', label: t('group'), icon: <GroupIcon />, onClick: onGroup, disabled: !canGroup || isLocked, dataTour: 'action-group' },
            { key: 'ungroup', label: t('ungroup'), icon: <UngroupIcon />, onClick: onUngroup, disabled: !canUngroup || isLocked, dataTour: 'action-ungroup' },
            { key: 'zoomIn', label: t('zoomIn'), icon: <ZoomInIcon />, onClick: () => onZoom(1.25), keepOpen: true },
            { key: 'zoomOut', label: t('zoomOut'), icon: <ZoomOutIcon />, onClick: () => onZoom(0.8), keepOpen: true },
            { key: 'fit', label: t('fitView'), icon: <FitViewIcon />, onClick: onFitView, dataTour: 'action-fit-view' },
            { key: 'trace', label: t('tracePhoto'), icon: <CameraIcon />, onClick: onImageTraceClick, disabled: isLocked, dataTour: 'action-trace-photo' },
            { key: 'guide', label: t('importGuide'), icon: <ImageIcon />, onClick: onImageImportClick },
            { key: 'svg', label: t('importSvg'), icon: <span className="text-[10px] font-bold leading-6">SVG</span>, onClick: onSvgImportClick, disabled: isLocked },
        ];
        const hiddenActive = moreItems.find(i => i.tool && i.tool === currentTool);

        return (
            <div data-tour="main-toolbar" className="relative w-full">
                {isMoreOpen && (
                    <>
                        {/* Tapping outside closes the panel. */}
                        <div className="fixed inset-0 z-40" onClick={() => setIsMoreOpen(false)} aria-hidden="true" />
                        <div role="dialog" aria-label={t('moreTools')} className="absolute bottom-full left-0 right-0 mb-3 z-50 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-2 max-h-[60vh] overflow-y-auto animate-fade-in-up">
                            {currentTool === 'calligraphy' && (
                                <div className="flex items-center justify-center gap-2 pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('calligraphyPen')}</span>
                                    {[45, 30, 15].map(angle => (
                                        <button key={angle} type="button" onClick={() => setCalligraphyAngle(angle as 45 | 30 | 15)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md ${calligraphyAngle === angle ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
                                            {angle}°
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="grid grid-cols-4 gap-1">
                                {moreItems.map(item => (
                                    <NamedButton key={item.key} label={item.label} icon={item.icon} disabled={item.disabled} dataTour={item.dataTour}
                                        active={!!item.tool && item.tool === currentTool}
                                        onClick={() => { item.onClick(); if (!item.keepOpen && item.tool !== 'calligraphy') setIsMoreOpen(false); }} />
                                ))}
                            </div>
                        </div>
                    </>
                )}
                <div className="flex items-stretch gap-0.5">
                    <NamedButton label={t('pen')} icon={<PenIcon />} onClick={() => setCurrentTool('pen')} active={currentTool === 'pen'} disabled={isLocked} dataTour="toolbar-pen" />
                    <NamedButton label={t('eraser')} icon={<EraserIcon />} onClick={() => setCurrentTool('eraser')} active={currentTool === 'eraser'} disabled={isLocked} dataTour="tool-eraser" />
                    <NamedButton label={t('select')} icon={<SelectIcon />} onClick={() => setCurrentTool('select')} active={currentTool === 'select'} dataTour="tool-select" />
                    {/* Undo and redo arrows are understood without words; that leaves room for the other names. */}
                    <button type="button" onClick={onUndo} disabled={!canUndo} title={t('undo')} aria-label={t('undo')} data-tour="action-undo"
                        className="w-11 flex-shrink-0 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 disabled:opacity-40"><UndoIcon className="w-6 h-6" /></button>
                    <button type="button" onClick={onRedo} disabled={!canRedo} title={t('redo')} aria-label={t('redo')} data-tour="action-redo"
                        className="w-11 flex-shrink-0 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 disabled:opacity-40"><RedoIcon className="w-6 h-6" /></button>
                    {/* Shows the chosen tool when it is one of the extra ones, so it's clear which tool is on. */}
                    <NamedButton label={hiddenActive ? hiddenActive.label : t('more')} icon={hiddenActive ? hiddenActive.icon : <MoreIcon />}
                        ariaLabel={t('moreTools')} ariaExpanded={isMoreOpen} active={!!hiddenActive || isMoreOpen}
                        onClick={() => setIsMoreOpen(o => !o)} dataTour="tool-more" />
                </div>
            </div>
        );
    }

    const commonTools = (
        <>
            <ToolButton tool="select" currentTool={currentTool} label={t('select')} onClick={setCurrentTool} dataTour="tool-select"><SelectIcon /></ToolButton>
            <ToolButton tool="edit" currentTool={currentTool} label={t('edit')} onClick={setCurrentTool} dataTour="tool-edit"><EditPointsIcon /></ToolButton>
            <ToolButton tool="pan" currentTool={currentTool} label={t('pan')} onClick={setCurrentTool} dataTour="tool-pan"><PanIcon /></ToolButton>
        </>
    );

    const drawingTools = (
        <>
            <ToolButton tool="pen" currentTool={currentTool} label={t('pen')} onClick={setCurrentTool} disabled={isLocked} dataTour="toolbar-pen"><PenIcon /></ToolButton>

            <div className="relative" ref={calligraphyToolButtonRef} data-tour="tool-calligraphy">
                <button
                    onClick={handleCalligraphyToolClick}
                    title={t('calligraphyPen')}
                    aria-label={t('calligraphyPen')}
                    aria-pressed={currentTool === 'calligraphy'}
                    disabled={isLocked}
                    className={`p-2 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
                    currentTool === 'calligraphy'
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                    }`}
                >
                    <CalligraphyIcon className="w-5 h-5" />
                     <div className={`absolute bottom-0.5 right-0.5 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] ${currentTool === 'calligraphy' ? 'border-b-white' : 'border-b-gray-500 dark:border-b-gray-400'}`}></div>
                </button>
                {isAnglePickerOpen && (
                    <div className={`absolute z-50 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 p-1 flex gap-1 animate-fade-in-up ${isLargeScreen ? 'left-full ml-2 top-0 flex-col' : 'bottom-full mb-2 left-1/2 -translate-x-1/2'}`}>
                        {[45, 30, 15].map((angle) => (
                            <button
                                key={angle}
                                onClick={() => { setCalligraphyAngle(angle as 45|30|15); setIsAnglePickerOpen(false); }}
                                className={`px-3 py-1 text-xs font-bold rounded-md w-full text-left transition-colors ${calligraphyAngle === angle ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                            >
                                {angle}°
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <ToolButton tool="line" currentTool={currentTool} label={t('line')} onClick={setCurrentTool} disabled={isLocked} dataTour="tool-line"><LineIcon /></ToolButton>
            <ToolButton tool="curve" currentTool={currentTool} label={t('curve')} onClick={setCurrentTool} disabled={isLocked}><CurveIcon /></ToolButton>
            <ToolButton tool="circle" currentTool={currentTool} label={t('circle')} onClick={setCurrentTool} disabled={isLocked}><CircleIcon /></ToolButton>
            <ToolButton tool="ellipse" currentTool={currentTool} label={t('ellipse')} onClick={setCurrentTool} disabled={isLocked}><EllipseIcon /></ToolButton>
            <ToolButton tool="dot" currentTool={currentTool} label={t('dot')} onClick={setCurrentTool} disabled={isLocked}><DotIcon /></ToolButton>

            <div className={`${isLargeScreen ? 'h-px w-full my-1.5 col-span-full' : 'hidden sm:block w-px h-6 mx-1'} bg-gray-300 dark:bg-gray-600`}></div>
            <ToolButton tool="eraser" currentTool={currentTool} label={t('eraser')} onClick={setCurrentTool} disabled={isLocked} dataTour="tool-eraser"><EraserIcon /></ToolButton>
            <ToolButton tool="slice" currentTool={currentTool} label={t('slice')} onClick={setCurrentTool} disabled={isLocked} dataTour="tool-slice"><SliceIcon /></ToolButton>
        </>
    );

    const actionTools = (
        <>
            <ActionButton onClick={onUndo} title={t('undo')} disabled={!canUndo} dataTour="action-undo"><UndoIcon /></ActionButton>
            <ActionButton onClick={onRedo} title={t('redo')} disabled={!canRedo} dataTour="action-redo"><RedoIcon /></ActionButton>
            <div className={`${isLargeScreen ? 'h-px w-full my-1.5 col-span-full' : 'hidden sm:block w-px h-6 mx-1'} bg-gray-300 dark:bg-gray-600`}></div>
            <ActionButton onClick={onCut} title={t('cut')} disabled={selectedPathIds.size === 0 || isLocked} dataTour="action-cut"><CutIcon /></ActionButton>
            <ActionButton onClick={onCopy} title={t('copy')} disabled={isLocked} dataTour="action-copy"><CopyIcon /></ActionButton>
            <ActionButton onClick={onPaste} title={t('paste')} disabled={!clipboard || isLocked} dataTour="action-paste"><PasteIcon /></ActionButton>
            <ActionButton onClick={onGroup} title={t('group')} disabled={!canGroup || isLocked} dataTour="action-group"><GroupIcon /></ActionButton>
            <ActionButton onClick={onUngroup} title={t('ungroup')} disabled={!canUngroup || isLocked} dataTour="action-ungroup"><UngroupIcon /></ActionButton>
            <div className={`${isLargeScreen ? 'h-px w-full my-1.5 col-span-full' : 'hidden sm:block w-px h-6 mx-1'} bg-gray-300 dark:bg-gray-600`}></div>
            <ActionButton onClick={() => onZoom(1.25)} title={t('zoomIn')}><ZoomInIcon /></ActionButton>
            <ActionButton onClick={() => onZoom(0.8)} title={t('zoomOut')}><ZoomOutIcon /></ActionButton>
            <ActionButton onClick={onFitView} title={t('fitView')} dataTour="action-fit-view"><FitViewIcon /></ActionButton>
            <div className={`${isLargeScreen ? 'h-px w-full my-1.5 col-span-full' : 'hidden sm:block w-px h-6 mx-1'} bg-gray-300 dark:bg-gray-600`}></div>
            <ActionButton onClick={onImageTraceClick} title={t('tracePhoto')} disabled={isLocked} dataTour="action-trace-photo"><CameraIcon /></ActionButton>
            <ActionButton onClick={onImageImportClick} title={t('importGuide')}><ImageIcon/></ActionButton>
            <ActionButton onClick={onSvgImportClick} title={t('importSvg')} disabled={isLocked}>
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fontFamily="sans-serif">SVG</text>
                </svg>
            </ActionButton>
        </>
    );

    if(isLargeScreen) {
        return (
            <div ref={sideToolbarRef} data-tour="main-toolbar" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-2 rounded-2xl grid grid-cols-2 gap-1.5 justify-items-center content-start shadow-2xl border border-gray-200 dark:border-gray-700 max-h-full w-max">
                 {commonTools}
                 <div className="h-px w-full my-1 col-span-full bg-gray-300 dark:bg-gray-600"></div>
                 {drawingTools}
                 <div className="h-px w-full my-1 col-span-full bg-gray-300 dark:bg-gray-600"></div>
                 {actionTools}
            </div>
        );
    }

    return (
        <div data-tour="main-toolbar" className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl w-full sm:w-auto max-w-[95vw]">
             <div className="flex flex-wrap items-center justify-center gap-2">
                {commonTools}
                <div className="hidden sm:block w-px h-6 mx-1 bg-gray-300 dark:bg-gray-600"></div>
                {drawingTools}
                <div className="hidden sm:block w-px h-6 mx-1 bg-gray-300 dark:bg-gray-600"></div>
                {actionTools}
             </div>
        </div>
    );
};

export default React.memo(DrawingToolbar);
