import { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, MenuItem, Grid, Divider, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DeleteSweep, AutoFixHigh } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useApp } from '../store/AppContext';
import { getDefaultState } from '../store/storage';
import { UserProfile, JobLevel } from '../types';
import PageTip from '../components/PageTip';

const SCOPE_BY_LEVEL: Record<string, string> = {
  'L3': `The IT Support Associate II (GSD1) delivers first-line technical support within the Global Service Desk (GSD), providing comprehensive IT assistance through chat, voice, and ticketing channels. The associate manages a portfolio of standard hardware and software solutions, demonstrating proficiency in diagnostics and troubleshooting across Windows, Mac, Customer Service Operating System (CSOS), mobile, and Linux platforms through remote services. All support is delivered following established security protocols and compliance requirements, ensuring the protection of company assets and data while maintaining service excellence.

Working within defined service level agreements, associates handle technical troubleshooting across enterprise applications, network connectivity, system access, and end-user computing while maintaining detailed documentation. Associates utilize Knowledge-Centered Service KCS methodology and AI-assisted tools to support efficient resolution and knowledge sharing. They identify and propose improvements to Standard Operating Procedures SOPs and support tools to enhance team efficiency and customer experience. Their professional communication skills are essential as they follow established procedures and practices. Using enterprise systems and available resources, they diagnose and resolve standard issues independently, collaborating with GSD2 through Assist when additional expertise is needed, or escalating to GSD2 after exhausting standard troubleshooting steps or when restricted by permission limitations.

Associates work on a rotating shift schedule, which is determined through a regular shift bidding process and may be subject to change. The frequency of rotation and shift options are based on business needs and may include day, evening, night, and weekend shifts. This flexible scheduling ensures 24/7 coverage to meet service level agreements. The role demands the ability to efficiently manage multiple concurrent support requests through chat channels to maintain service level agreements and deliver timely resolutions. They actively participate in team meetings and collaborate with IT teams and stakeholders. Success in this role requires balancing independent problem-solving with team collaboration, maintaining security awareness, meeting business-defined performance metrics including Customer Satisfaction (CSAT), Average Resolution Rate (ARR), and Average Handle Time (AHT), and consistently delivering exceptional customer experiences while supporting broader organizational objectives.`,

  'L4': `The IT Support Engineer I (GSD) advances technical problem-solving and system optimization for Amazon's corporate customers across the enterprise environment. Operating with elevated system permissions, this role requires experience in complex troubleshooting across enterprise systems and the ability to resolve issues that may not yet have Standard Operating Procedures (SOPs). The IT Support Engineer I will execute problem-solving within established frameworks, managing technical decisions and escalation paths while evaluating and prioritizing based on business impact and SLAs. This engineer will lead complex troubleshooting across enterprise systems, making informed resource and time allocation decisions based on severity, timeframe, and work volume. They independently determine when to resolve issues or appropriately delegate to colleagues or specialized teams.

Core responsibilities include creating and maintaining technical documentation and guides, implementing solutions and establishing best practices, and providing technical advisory and support across Amazon's global infrastructure. They will support operational excellence and service delivery while handling complex technical situations and deviations from SOPs, demonstrating sound judgment in escalation decisions. The engineer will train and onboard new team members and drive day-to-day performance improvements, supporting the continuous growth of the GSD team. They demonstrate excellence in stakeholder management through driving clear documentation and cross-regional communications, leading technical meetings, and presenting decisions and updates to leadership. Their ability to drive constructive technical discussions and ask purposeful questions advances business objectives.

Success requires building effective cross-team collaborations while driving process efficiency and knowledge sharing initiatives. The role emphasizes driving representation and equity in technical teams and incorporating diverse perspectives in solutions. They will identify and address operational gaps while maintaining focus on customer satisfaction and service excellence. This position demands both technical expertise and leadership capabilities, measured through system improvements, operational efficiency, and stakeholder satisfaction. The engineer's commitment to inclusive solutions for all users and ability to challenge status quo for positive change strengthens GSD's continuous improvement and professional development culture.`,

  'L5': `The IT Support Engineer II (ITSE II) serves as a technical and strategic leader within Amazon's Global Service Desk, combining advanced IT infrastructure expertise with project management capabilities. As a Knowledge Domain Expert (KDE), they lead complex problem management initiatives impacting the entire employee experience, performing root cause analysis and developing workarounds during critical situations. Their writing skills and technical expertise drive organizational impact aligned to business goals, such as contact reduction through problem management deep dives and improved cost to serve metrics through operational excellence initiatives.

Operating across GSD3, GSD-Experience, and GSD-Operational Excellence Teams, engineers develop and implement technical solutions while managing multiple concurrent projects spanning regional locations. They create and optimize Standard Operating Procedures using Knowledge Centered Service (KCS) methodology, conduct content audits, and collaborate with teams including ITOPM, L&D, and Enterprise Engineering. Their technical proficiency includes software/scripting languages and AWS technologies, which they apply to automate tasks and improve software tools. They plan and coordinate complex change management processes, develop templates, and audit work quality of team members and vendors.

Engineers provide technical mentorship, contribute to hiring processes, and manage stakeholder communications up to three levels above (L8). They own Correction of Errors (COEs) and related action items, creating technical documentation including one-pagers and PR/FAQs. Success is measured through initiative completion, knowledge content quality, efficiency improvements, project timelines, and process optimization results. The ITSE II delivers clear verbal and written communications for executive summaries and operational reviews while balancing immediate technical challenges with long-term strategic objectives to elevate technical standards within the Global Service Desk and broader IT Services organization.`,

  'L6': `The IT Support Engineer II (ITSE II) serves as a technical and strategic leader within Amazon's Global Service Desk, combining advanced IT infrastructure expertise with project management capabilities. As a Knowledge Domain Expert (KDE), they lead complex problem management initiatives impacting the entire employee experience, performing root cause analysis and developing workarounds during critical situations. In GSD3, engineers handle OnCall responsibilities for high severity tickets within GSD. They act as the last line of escalation on all support requests, understanding when to partner with and escalate to service owners if all other options have been exhausted.

Engineers develop and implement technical solutions while managing multiple concurrent projects spanning regional locations. Engineers provide technical mentorship, contribute to hiring processes, and manage stakeholder communications up to three levels above (L8). They own Correction of Errors (COEs) and related action items, creating technical documentation including one-pagers and PR/FAQs. The ITSE II delivers clear verbal and written communications for executive summaries and operational reviews while balancing immediate technical challenges with long-term strategic objectives.`,
};

const LEVELS: JobLevel[] = ['L3', 'L4', 'L5', 'L6'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function ProfilePage() {
  const { state, dispatch } = useApp();
  const { control, handleSubmit } = useForm<UserProfile>({ defaultValues: state.profile });
  const [confirmReset, setConfirmReset] = useState(false);

  const onSubmit = (data: UserProfile) => {
    dispatch({ type: 'SET_PROFILE', payload: { ...data, id: state.profile.id } });
  };

  const handleReset = () => {
    const fresh = getDefaultState();
    dispatch({ type: 'RESET_STATE', payload: fresh });
    setConfirmReset(false);
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
        extra={state.profile.targetLevel && SCOPE_BY_LEVEL[state.profile.targetLevel] && state.scopeOfRole !== SCOPE_BY_LEVEL[state.profile.targetLevel] ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AutoFixHigh />}
            onClick={() => {
              if (state.scopeOfRole && !window.confirm('This will replace your current scope. Continue?')) return;
              dispatch({ type: 'SET_SCOPE_OF_ROLE', payload: SCOPE_BY_LEVEL[state.profile.targetLevel] });
            }}
          >
            Auto-fill from {state.profile.targetLevel} Guidelines
          </Button>
        ) : undefined}
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

      <Paper sx={{ p: 3, maxWidth: 700, mt: 3, border: '1px solid', borderColor: 'error.main' }}>
        <Typography variant="h6" gutterBottom color="error">Reset All Data</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Clear all data (profile, STAR entries, metrics, and narratives) so you can start fresh or import a new portfolio.
        </Typography>
        <Button variant="outlined" color="error" startIcon={<DeleteSweep />} onClick={() => setConfirmReset(true)}>
          Reset Everything
        </Button>
      </Paper>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Reset all data?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete all your data including profile, STAR entries, metrics, and narrative sections. This cannot be undone.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Tip: Export your session first if you want to keep a backup.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleReset}>Reset Everything</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function NarrativeSection({ title, description, value, onChange, extra }: { title: string; description: string; value: string; onChange: (v: string) => void; extra?: React.ReactNode }) {
  return (
    <Paper sx={{ p: 3, maxWidth: 700, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0 }}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        {extra}
      </Box>
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


