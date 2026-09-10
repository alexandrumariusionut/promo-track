import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Box,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  IconButton,
  Tooltip,
  Divider,
  Menu,
  Button,
  Typography,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import Delete from '@mui/icons-material/Delete';
import DragIndicator from '@mui/icons-material/DragIndicator';
import Visibility from '@mui/icons-material/Visibility';
import ImageIcon from '@mui/icons-material/Image';
import TextFields from '@mui/icons-material/TextFields';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import { v4 as uuid } from 'uuid';
import WordCount from '../WordCount';
import ImproveSTARRButton from '../ai/ImproveSTARRButton';
import { STAREntry, CustomField, LEADERSHIP_PRINCIPLES, LeadershipPrinciple, AISuggestedDimension } from '../../types';
import { GUIDELINES, Guideline } from '../../data/levelGuidelines';
import { getQuarter } from '../../utils/helpers';
import { showError } from '../ErrorSnackbar';
import { useApp } from '../../store/AppContext';
import { suggestDimensions, DimensionSuggestion } from '../../utils/aiPrompts';
import { chat } from '../../utils/ai';
import { validateSuggestions } from '../../utils/dimensionScoring';


const sanitize = (text: string) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const DEFAULT_STAR_FIELDS = ['situation', 'task', 'action', 'result'];
const FIELD_ROWS = { situation: 3, task: 3, action: 4, result: 3 };
const FIELD_PLACEHOLDERS: Record<string, string> = {
  situation: 'Explain the situation so that your reader understands the context of your example. They do not need to know every detail.',
  task: 'Describe the task, problem, or challenge that you took responsibility for completing, or the goal of your efforts.',
  action: 'Describe the actions that you personally took to complete the task or reach the end goal. Highlight skills or character traits.',
  result: 'Explain the positive outcomes or results of your actions or efforts. Highlight quantifiable results.',
};

interface FormState {
  title: string;
  date: string;
  impactLevel: string;
  principles: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  customFields: CustomField[];
  hiddenFields: string[];
  evidenceLinks: string;
  fieldOrder: string[];
  fieldLabels: Record<string, string>;
  levelDimension: string;
  dimensions: string[];
  themes: string[];
  aiSuggestedDimensions: AISuggestedDimension[];
}

interface UnifiedField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'image';
  isStandard: boolean;
  key?: string;
}

const emptyForm = (): FormState => ({
  title: '',
  date: new Date().toISOString().split('T')[0],
  impactLevel: 'Medium',
  principles: [],
  situation: '',
  task: '',
  action: '',
  result: '',
  customFields: [],
  hiddenFields: [],
  evidenceLinks: '',
  fieldOrder: [...DEFAULT_STAR_FIELDS],
  fieldLabels: {},
  levelDimension: '',
  dimensions: [],
  themes: [],
  aiSuggestedDimensions: [],
});

const fromEntry = (entry: STAREntry): FormState => ({
  title: entry.title,
  date: entry.date,
  impactLevel: entry.impactLevel,
  principles: entry.principles,
  situation: entry.situation,
  task: entry.task,
  action: entry.action,
  result: entry.results,
  customFields: entry.customFields || [],
  hiddenFields: [],
  evidenceLinks: entry.evidenceLinks?.join('\n') || '',
  fieldOrder: [...DEFAULT_STAR_FIELDS, ...(entry.customFields || []).map(cf => cf.id)],
  fieldLabels: {},
  levelDimension: entry.levelDimension || '',
  dimensions: entry.dimensions || [],
  themes: entry.themes || [],
  aiSuggestedDimensions: entry.aiSuggestedDimensions || [],
});

interface STARRFormDialogProps {
  open: boolean;
  editing: STAREntry | null;
  onClose: () => void;
  onSubmit: (entry: STAREntry) => void;
  /** Pre-tag the entry with this responsibility id when opening for a new entry */
  preTaggedResponsibility?: string;
  /** Helper text to show in the dialog (e.g. what reviewers look for) */
  helperText?: string;
}

export default function STARRFormDialog({ open, editing, onClose, onSubmit, preTaggedResponsibility, helperText }: STARRFormDialogProps) {
  const { state: appState } = useApp();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<DimensionSuggestion[]>([]);

  const targetLevel = appState.profile.targetLevel;
  const guidelines = useMemo(
    () => GUIDELINES[targetLevel as 'L4' | 'L5'] || [],
    [targetLevel],
  );

  useEffect(() => {
    if (editing) {
      setForm(fromEntry(editing));
    } else {
      const fresh = emptyForm();
      // Pre-tag with guideline if provided
      if (preTaggedResponsibility && guidelines.some(g => g.id === preTaggedResponsibility)) {
        fresh.dimensions = [preTaggedResponsibility];
      }
      setForm(fresh);
    }
    setTitleError(false);
  }, [editing, preTaggedResponsibility, guidelines]);

  const setField = (field: keyof FormState, value: FormState[keyof FormState]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleField = (field: string) => {
    setForm(prev => ({
      ...prev,
      hiddenFields: prev.hiddenFields.filter(f => f !== field)
    }));
  };

  const addCustomField = (type: 'text' | 'image') => {
    const newField: CustomField = {
      id: uuid(),
      label: '',
      value: '',
      type
    };
    setForm(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField]
    }));
    setAddMenuAnchor(null);
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setForm(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  };

  const removeCustomField = (id: string) => {
    setForm(prev => ({
      ...prev,
      customFields: prev.customFields.filter(f => f.id !== id)
    }));
  };

  const handleImageUpload = (fieldId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_IMAGE_SIZE) {
      showError('Image must be under 2MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const field = allFields.find(f => f.id === fieldId);
      if (field) {
        setFieldValue(field, result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAIApply = (fields: Partial<STAREntry>) => {
    setForm(prev => ({
      ...prev,
      ...(fields.situation && { situation: fields.situation }),
      ...(fields.task && { task: fields.task }),
      ...(fields.action && { action: fields.action }),
      ...(fields.results && { result: fields.results }),
    }));
  };

  const buildEntryFromForm = (): STAREntry => ({
    id: editing?.id || uuid(),
    title: sanitize(form.title.trim()),
    date: form.date,
    quarter: getQuarter(form.date),
    impactLevel: form.impactLevel as 'Low' | 'Medium' | 'High' | 'Critical',
    principles: form.principles as LeadershipPrinciple[],
    situation: form.situation,
    task: form.task,
    action: form.action,
    results: form.result,
    customFields: form.customFields,
    evidenceLinks: form.evidenceLinks.split('\n').filter(link => link.trim()),
    levelDimension: form.levelDimension || undefined,
    dimensions: form.dimensions.length > 0 ? form.dimensions : undefined,
    themes: form.themes.length > 0 ? form.themes : undefined,
    aiSuggestedDimensions: form.aiSuggestedDimensions.length > 0 ? form.aiSuggestedDimensions : undefined,
  });

  const allFields: UnifiedField[] = (() => {
    const standardMap = new Map(
      DEFAULT_STAR_FIELDS
        .filter(key => !form.hiddenFields.includes(key))
        .map(key => [key, {
          id: key,
          label: form.fieldLabels[key] || key.charAt(0).toUpperCase() + key.slice(1),
          value: form[key as keyof FormState] as string,
          type: 'text' as const,
          isStandard: true,
          key,
        }])
    );
    const customMap = new Map(form.customFields.map(cf => [cf.id, {
      id: cf.id, label: cf.label, value: cf.value, type: cf.type, isStandard: false,
    }]));

    const ordered: UnifiedField[] = [];
    for (const id of form.fieldOrder) {
      const s = standardMap.get(id);
      const c = customMap.get(id);
      if (s) { ordered.push(s); standardMap.delete(id); }
      else if (c) { ordered.push(c); customMap.delete(id); }
    }
    // Append any fields not in order yet
    standardMap.forEach(f => ordered.push(f));
    customMap.forEach(f => ordered.push(f));
    return ordered;
  })();

  const setFieldValue = (field: UnifiedField, value: string) => {
    if (field.isStandard && field.key) {
      setField(field.key as keyof FormState, value);
    } else {
      updateCustomField(field.id, { value });
    }
  };

  const setFieldLabel = (field: UnifiedField, label: string) => {
    if (field.isStandard && field.key) {
      setForm(prev => ({ ...prev, fieldLabels: { ...prev.fieldLabels, [field.key!]: label } }));
    } else {
      updateCustomField(field.id, { label });
    }
  };

  const removeField = (field: UnifiedField) => {
    if (field.isStandard && field.key) {
      setForm(prev => ({
        ...prev,
        hiddenFields: [...prev.hiddenFields, field.key!]
      }));
    } else {
      removeCustomField(field.id);
    }
  };

  const moveField = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= allFields.length) return;
    const newOrder = allFields.map(f => f.id);
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setForm(prev => ({ ...prev, fieldOrder: newOrder }));
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      setTitleError(true);
      return;
    }
    onSubmit(buildEntryFromForm());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle>{editing ? 'Edit' : 'New'} STAR Narrative</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important', overflowY: 'auto' }}>
        <TextField label="Title" value={form.title} onChange={e => { setField('title', e.target.value); setTitleError(false); }} fullWidth error={titleError} helperText={titleError ? 'Title is required' : ''} />
        <FormControl fullWidth>
          <InputLabel>Leadership Principles</InputLabel>
          <Select<string[]> multiple value={form.principles} onChange={e => setField('principles', e.target.value)} input={<OutlinedInput label="Leadership Principles" />}
            renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{sel.map((v: string) => <Chip key={v} label={v} size="small" />)}</Box>}>
            {LEADERSHIP_PRINCIPLES.map((lp: LeadershipPrinciple) => <MenuItem key={lp} value={lp}>{lp}</MenuItem>)}
          </Select>
        </FormControl>
        {/* Dimensions demonstrated */}
        {guidelines.length > 0 && (
          <Box>
            {/* Helper text from panel (what reviewers look for) */}
            {helperText && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
                💡 {helperText}
              </Typography>
            )}
            <Autocomplete
              multiple
              options={guidelines}
              getOptionLabel={(option: Guideline) => option.name}
              value={guidelines.filter(g => form.dimensions.includes(g.id))}
              onChange={(_e, newValue) => setField('dimensions', newValue.map(g => g.id))}
              filterOptions={(options, { inputValue }) => {
                const lower = inputValue.toLowerCase();
                return options.filter(o => o.name.toLowerCase().includes(lower));
              }}
              renderOption={(props, option: Guideline) => (
                <li {...props} key={option.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{option.name}</Typography>
                  </Box>
                </li>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  // Short label = first sentence (up to first period)
                  const shortLabel = option.name.includes('.')
                    ? option.name.slice(0, option.name.indexOf('.') + 1)
                    : option.name;
                  return (
                    <Tooltip key={key} title={option.name} arrow>
                      <Chip label={shortLabel} size="small" {...tagProps} />
                    </Tooltip>
                  );
                })
              }
              renderInput={(params) => (
                <TextField {...params} label="Role guidelines demonstrated" placeholder="Select guidelines..." />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Button
                size="small"
                variant="text"
                startIcon={aiSuggesting ? <CircularProgress size={14} /> : <AutoAwesome />}
                onClick={async () => {
                  setAiSuggesting(true);
                  setPendingSuggestions([]);
                  try {
                    const entry = buildEntryFromForm();
                    const prompt = suggestDimensions(entry, guidelines);
                    const raw = await chat(prompt.system, prompt.user);
                    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    const parsed = JSON.parse(cleaned);
                    const suggestions: DimensionSuggestion[] = parsed.suggestions || [];
                    // Filter out already-tagged dimensions
                    const newSuggestions = suggestions.filter(s => !form.dimensions.includes(s.id));
                    // Validate quotes against entry text
                    const validated = validateSuggestions(
                      newSuggestions.map(s => ({ id: s.id, justification: s.justification })),
                      entry,
                    );
                    setPendingSuggestions(validated.map(v => {
                      const orig = newSuggestions.find(s => s.id === v.id);
                      return orig || { id: v.id, justification: v.justification, confidence: 'medium' as const };
                    }));
                  } catch (e) {
                    showError(e instanceof Error ? e.message : 'AI suggestion failed');
                  } finally {
                    setAiSuggesting(false);
                  }
                }}
                disabled={aiSuggesting || (!form.situation && !form.action && !form.result)}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Suggest with AI
              </Button>
            </Box>
            {/* Pending AI suggestions */}
            {pendingSuggestions.length > 0 && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  AI suggestions (accept or reject):
                </Typography>
                {pendingSuggestions.map(suggestion => {
                  const guideline = guidelines.find(g => g.id === suggestion.id);
                  if (!guideline) return null;
                  return (
                    <Box key={suggestion.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.75 }}>
                      <Tooltip title="Accept">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            setField('dimensions', [...form.dimensions, suggestion.id]);
                            setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
                          }}
                          aria-label={`Accept ${guideline.name}`}
                        >
                          <Check sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
                          }}
                          aria-label={`Reject ${guideline.name}`}
                        >
                          <Close sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Box>
                        <Chip label={guideline.name} size="small" variant="outlined" sx={{ mb: 0.25 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {suggestion.justification}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
        {/* All fields — standard STAR + custom — unified rendering */}
        {allFields.map((field, idx) => (
          <Box key={field.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <DragIndicator sx={{ fontSize: 18, color: 'text.disabled' }} />
              {field.isStandard ? (
                <TextField size="small" value={field.label} onChange={e => setFieldLabel(field, e.target.value)}
                  variant="standard" sx={{ flex: 1, '& input': { fontWeight: 600 } }} />
              ) : (
                <TextField size="small" value={field.label} onChange={e => setFieldLabel(field, e.target.value)}
                  variant="standard" sx={{ flex: 1, '& input': { fontWeight: 600 } }} placeholder="Field name" />
              )}
              <Tooltip title="Move up"><IconButton size="small" onClick={() => moveField(idx, -1)} disabled={idx === 0} aria-label="Move field up"><ArrowUpward sx={{ fontSize: 16 }} /></IconButton></Tooltip>
              <Tooltip title="Move down"><IconButton size="small" onClick={() => moveField(idx, 1)} disabled={idx === allFields.length - 1} aria-label="Move field down"><ArrowDownward sx={{ fontSize: 16 }} /></IconButton></Tooltip>
              <Tooltip title="Remove"><IconButton size="small" color="error" onClick={() => removeField(field)} aria-label="Remove field"><Delete sx={{ fontSize: 16 }} /></IconButton></Tooltip>
            </Box>
            {field.type === 'text' ? (
              <>
                <TextField value={field.value} onChange={e => setFieldValue(field, e.target.value)}
                  multiline rows={field.isStandard ? (FIELD_ROWS[field.key! as keyof typeof FIELD_ROWS] || 3) : 3} fullWidth placeholder={field.isStandard && field.key ? (FIELD_PLACEHOLDERS[field.key] || 'Enter text...') : 'Enter text...'} />
                <WordCount text={field.value} />
              </>
            ) : (
              <Box>
                {field.value ? (
                  <Box sx={{ position: 'relative', display: 'inline-block' }}>
                    <Box component="img" src={field.value} alt={field.label} sx={{ maxWidth: '100%', maxHeight: 300, borderRadius: 1 }} />
                    <IconButton size="small" color="error" onClick={() => setFieldValue(field, '')}
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper' }}>
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined" startIcon={<ImageIcon />} component="label" aria-label="Upload image">
                    Upload Image (max 2MB)
                    <input type="file" accept="image/*" hidden onChange={e => handleImageUpload(field.id, e)} />
                  </Button>
                )}
              </Box>
            )}
          </Box>
        ))}
        {/* Add field button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Button startIcon={<AddCircleOutline />} onClick={e => setAddMenuAnchor(e.currentTarget)} variant="text" size="small">
            Add Field
          </Button>
          <Menu anchorEl={addMenuAnchor} open={!!addMenuAnchor} onClose={() => setAddMenuAnchor(null)}>
            <MenuItem onClick={() => addCustomField('text')}><TextFields sx={{ mr: 1, fontSize: 18 }} /> Text Field</MenuItem>
            <MenuItem onClick={() => addCustomField('image')}><ImageIcon sx={{ mr: 1, fontSize: 18 }} /> Image</MenuItem>
            {form.hiddenFields.length > 0 && <Divider />}
            {form.hiddenFields.map(f => (
              <MenuItem key={f} onClick={() => { toggleField(f); setAddMenuAnchor(null); }}>
                <Visibility sx={{ mr: 1, fontSize: 18 }} /> Restore {f.charAt(0).toUpperCase() + f.slice(1)}
              </MenuItem>
            ))}
          </Menu>
        </Box>
        <TextField label="Evidence Links (one per line)" value={form.evidenceLinks}
          onChange={e => setField('evidenceLinks', e.target.value)} multiline rows={2} fullWidth />
        {editing?.reviewComments && editing.reviewComments.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
              💬 Conversation
            </Typography>
            {[...editing.reviewComments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((c, i) => (
              <Box key={c.id || i} sx={{ bgcolor: c.source === 'engineer' ? 'action.hover' : 'action.selected', borderRadius: 2, p: '10px 14px', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: c.source === 'engineer' ? 'primary.main' : 'text.secondary' }}>
                  {c.source === 'engineer' ? 'You' : 'Manager'}
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7, mt: 0.25 }}>{c.text}</Typography>
                {c.date && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>{c.date}</Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1 }}>
          <ImproveSTARRButton entry={buildEntryFromForm()} onApply={handleAIApply} />
        </Box>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>{editing ? 'Update' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  );
}