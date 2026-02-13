import { Box, Typography, TextField, Button, Paper, MenuItem, Grid, Divider } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useApp } from '../store/AppContext';
import { UserProfile, JobLevel } from '../types';
import PageTip from '../components/PageTip';

const LEVELS: JobLevel[] = ['L3', 'L4', 'L5', 'L6'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ProfilePage() {
  const { state, dispatch } = useApp();
  const { control, handleSubmit } = useForm<UserProfile>({ defaultValues: state.profile });

  const onSubmit = (data: UserProfile) => {
    dispatch({ type: 'SET_PROFILE', payload: { ...data, id: state.profile.id } });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Profile Settings</Typography>
      <PageTip id="profile" title="Profile & Narrative Sections">
        Fill in your employee information — this populates the header of your promotion document. Below the profile form you'll find three narrative sections: Scope of Role, Best Reasons Not to Promote, and Additional Information. These map directly to sections 2, 4, and 6 of the promotion template. Aim for 300-500 words each.
      </PageTip>
      <Paper sx={{ p: 3, maxWidth: 700 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}><Typography variant="h6" color="primary">Employee Information</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="name" control={control} render={({ field }) => <TextField {...field} label="Full Name" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="email" control={control} render={({ field }) => <TextField {...field} label="Email / Alias" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="role" control={control} render={({ field }) => <TextField {...field} label="Current Job Title" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="proposedTitle" control={control} render={({ field }) => <TextField {...field} label="Proposed Job Title" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Controller name="level" control={control} render={({ field }) => (
                <TextField {...field} label="Current Level" select fullWidth>
                  {LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </TextField>
              )} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Controller name="targetLevel" control={control} render={({ field }) => (
                <TextField {...field} label="Target Level" select fullWidth>
                  {LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </TextField>
              )} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Controller name="effectiveQuarter" control={control} render={({ field }) => (
                <TextField {...field} label="Effective Quarter" select fullWidth>
                  {QUARTERS.map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                </TextField>
              )} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Controller name="startDate" control={control} render={({ field }) => <TextField {...field} label="Tenure Start Date" type="date" InputLabelProps={{ shrink: true }} fullWidth />} />
            </Grid>

            <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /><Typography variant="h6" color="primary">Management Chain</Typography></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="manager" control={control} render={({ field }) => <TextField {...field} label="Manager Name" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="team" control={control} render={({ field }) => <TextField {...field} label="Team" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="steamMember" control={control} render={({ field }) => <TextField {...field} label="Steam Member" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="steamDirect" control={control} render={({ field }) => <TextField {...field} label="Steam Direct" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="promotionApprover" control={control} render={({ field }) => <TextField {...field} label="Promotion Approver" fullWidth />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="targetPromotionDate" control={control} render={({ field }) => <TextField {...field} label="Target Promotion Date" type="date" InputLabelProps={{ shrink: true }} fullWidth />} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Button type="submit" variant="contained" size="large">Save Profile</Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Scope of Role & Best Reasons sections */}
      <NarrativeSection
        title="Scope of Role"
        description="Describe the current role responsibilities and the scope at the next level. (500 words or fewer recommended)"
        value={state.scopeOfRole}
        onChange={(v: string) => dispatch({ type: 'SET_SCOPE_OF_ROLE', payload: v })}
      />
      <NarrativeSection
        title="Best Reasons Not to Promote"
        description="Identify growth areas the employee is capable of developing. (500 words or fewer recommended)"
        value={state.bestReasonsNotToPromote}
        onChange={(v: string) => dispatch({ type: 'SET_BEST_REASONS', payload: v })}
      />
      <NarrativeSection
        title="Additional Information"
        description="Supplemental information: contributions to Bar Raiser Program, affinity groups, etc. (500 words or fewer recommended)"
        value={state.additionalInfo}
        onChange={(v: string) => dispatch({ type: 'SET_ADDITIONAL_INFO', payload: v })}
      />
    </Box>
  );
}

function NarrativeSection({ title, description, value, onChange }: { title: string; description: string; value: string; onChange: (v: string) => void }) {
  return (
    <Paper sx={{ p: 3, maxWidth: 700, mt: 3 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
      <TextField
        multiline rows={6} fullWidth value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`Enter ${title.toLowerCase()} here...`}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {value.split(/\s+/).filter(Boolean).length} / 500 words
      </Typography>
    </Paper>
  );
}
