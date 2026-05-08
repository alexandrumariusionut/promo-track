import { useEffect, useRef, useState } from 'react';
import { Box, Button, useTheme } from '@mui/material';
import { useOnboarding } from '../context/OnboardingContext';

const getCSS = (dark: boolean) => {
  const text = dark ? '#e0e0e0' : '#232f3e';
  const bg = dark ? '#1e1e1e' : '#f5f5f5';
  const bgAlt = dark ? '#2a2a2a' : '#f8f9fa';
  const border = dark ? '#444' : '#ddd';
  const link = dark ? '#5ca8e0' : '#0073bb';
  const panelBg = dark ? '#2a2a2a' : '#f5f5f5';
  const cardBg = dark ? '#2a2a2a' : 'white';
  const subText = dark ? '#aaa' : '#666';
  const subText2 = dark ? '#888' : '#999';
  const tableTh = dark ? '#37474f' : '#232f3e';
  const sboxBg = dark ? '#37474f' : '#232f3e';
  const headingColor = dark ? '#e0e0e0' : '#232f3e';

  return `
.wiki-guidelines-content { font-family: 'Amazon Ember', Arial, sans-serif; color: ${text}; line-height: 1.6; }
.wiki-guidelines-content .hero-promo-banner img { width: 100%; height: auto; border-radius: 8px; }
.wiki-guidelines-content .box { background-color: ${bg}; border-radius: 4px; padding: 20px; margin: 10px 0; }
.wiki-guidelines-content h2 { margin-top: 30px; margin-bottom: 15px; }
.wiki-guidelines-content h3 { margin-top: 20px; margin-bottom: 10px; }
.wiki-guidelines-content h2 span span[style*="font-size:40px"] { font-size: 32px !important; font-weight: 700; color: ${headingColor}; }
.wiki-guidelines-content p { line-height: 1.6; margin-bottom: 12px; }
.wiki-guidelines-content ul { padding-left: 20px; }
.wiki-guidelines-content li { margin-bottom: 6px; line-height: 1.6; }
.wiki-guidelines-content a { color: ${link}; text-decoration: none; }
.wiki-guidelines-content a:hover { text-decoration: underline; }
.wiki-guidelines-content img { max-width: 100%; height: auto; }
.wiki-guidelines-content img[alt="accept"], .wiki-guidelines-content img[alt="error"], .wiki-guidelines-content img[alt="exclamation"] { width: 16px; height: 16px; vertical-align: middle; margin-right: 4px; }
.wiki-guidelines-content .styled-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
.wiki-guidelines-content .styled-table th { background-color: ${tableTh}; color: white; padding: 12px 15px; text-align: center; }
.wiki-guidelines-content .styled-table td { padding: 12px 15px; border-bottom: 1px solid ${border}; text-align: center; }
.wiki-guidelines-content .styled-table tr:nth-child(even) { background-color: ${bgAlt}; }
.wiki-guidelines-content table { width: 100%; border-collapse: collapse; }
.wiki-guidelines-content table td, .wiki-guidelines-content table th { padding: 10px; vertical-align: top; }
.wiki-guidelines-content .icPromoSTAR { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin: 20px 0; }
.wiki-guidelines-content .STARcontainer { display: flex; align-items: flex-start; border-radius: 8px; padding: 16px; flex: 1; min-width: 200px; max-width: 280px; color: white; }
.wiki-guidelines-content .STARcontainer.SBox { background-color: ${sboxBg}; }
.wiki-guidelines-content .STARcontainer.TBox { background-color: #ff9900; }
.wiki-guidelines-content .STARcontainer.ABox { background-color: #146eb4; }
.wiki-guidelines-content .STARcontainer.RBox { background-color: #1a8a5c; }
.wiki-guidelines-content .STARInitial { font-size: 48px; font-weight: 700; margin-right: 12px; line-height: 1; }
.wiki-guidelines-content .STARContents h3 { margin: 0 0 8px 0; font-size: 16px; color: white; }
.wiki-guidelines-content .STARContents p { margin: 0; font-size: 13px; opacity: 0.9; color: white; }
.wiki-guidelines-content .panel-group { margin: 10px 0; }
.wiki-guidelines-content .panel { border: 1px solid ${border}; border-radius: 4px; margin-bottom: 4px; }
.wiki-guidelines-content .panel-heading { background-color: ${panelBg}; padding: 10px 15px; cursor: pointer; }
.wiki-guidelines-content .panel-title { margin: 0; font-size: 14px; }
.wiki-guidelines-content .panel-title a { text-decoration: none; color: ${text}; display: block; }
.wiki-guidelines-content .panel-collapse { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.wiki-guidelines-content .panel-collapse.in { max-height: 5000px; }
.wiki-guidelines-content .panel-body { padding: 15px; }
.wiki-guidelines-content .panel-description { font-size: 14px; line-height: 1.6; }
.wiki-guidelines-content .downloadBtn { margin: 15px 0; }
.wiki-guidelines-content .dlButton { background-color: #ff9900; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600; }
.wiki-guidelines-content .dlButton:hover { background-color: #e88b00; }
.wiki-guidelines-content .leveling-table td:first-child { font-weight: 600; white-space: nowrap; width: 200px; background-color: ${bgAlt}; }
.wiki-guidelines-content .speaker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin: 20px 0; }
.wiki-guidelines-content .speaker-card { background: ${cardBg}; border: 1px solid ${border}; border-radius: 8px; padding: 16px; }
.wiki-guidelines-content .speaker-card h4 { margin: 0 0 4px 0; font-size: 15px; color: ${text}; }
.wiki-guidelines-content .speaker-card .speaker-title { font-size: 13px; color: ${subText}; margin-bottom: 4px; }
.wiki-guidelines-content .speaker-card .speaker-date { font-size: 13px; color: ${subText2}; margin-bottom: 8px; }
.wiki-guidelines-content .speaker-card a { font-size: 13px; }
.wiki-guidelines-content table[style*="background-color:#fff"], .wiki-guidelines-content table[style*="background: #fff"] { background-color: ${bg} !important; }
.wiki-guidelines-content table[style*="background-color:#fff"] th[style*="background-color:#fff"], .wiki-guidelines-content table[style*="background: #fff"] th[style*="background-color:#fff"] { background-color: ${bg} !important; }
.wiki-guidelines-content table[style*="background-color:#fff"] td, .wiki-guidelines-content table[style*="background: #fff"] td { color: ${text}; }
.wiki-guidelines-content div[style*="background-color:#fff"] { background-color: ${bg} !important; }
.wiki-guidelines-content table td, .wiki-guidelines-content table th { color: ${text}; }
.wiki-guidelines-content strong { color: ${text}; }`;
};

// HTML content split into parts to stay within file size limits
const HTML_PART1 = `
<div class="hero-promo-banner"><p><img src="/wiki-assets/its-promo-banner.jpg" alt="ITS IC Promo Banner"></p></div>

<div id="itsProcess"></div>
<h2 id="HPromotionProcess"><span><strong><span style="font-size:40px">Promotion Process</span></strong></span></h2>

<div id="promoSummary"></div>
<div class="box">
<h2 id="HITIndividualContributor28IC29PromotionSummary" class="wikigeneratedheader"><span><strong><span style="font-size:40px">IT Individual Contributor (IC) Promotion Summary</span></strong></span></h2>
<p>At Amazon, people are our most valued resource. Promotions play an important role in our approach to recognizing employee growth and achievement and maintaining our high-performance culture. These promotions occur quarterly for job levels up to L6 and twice a year for senior-level promotions (L7+).</p>
<p>We promote when the employee's role is scoped at the next level, the employee has consistently demonstrated next-level performance and there is role available at next level. At the time of promotion, we expect they will still have some areas to grow at the next level. We promote those we believe will raise the bar over time, with the capability to grow any necessary skills through coaching and on-the-job learning. If an employee is already exceeding expectations at the next level, we may have waited too long to promote.</p>
<p>This wiki will define the promotion process criteria at each phase for IT Support Associates (ITSAs) and IT Support Engineers (ITSEs). With increased transparency, ITSAs/ITSEs will be empowered to assist their IT Support Manager (ITSM) in their efforts to promote their experienced employees successfully.</p>
<p>If you are interested in a promotion, it is a good idea to keep track of your accomplishments. One way to do this is to write work summaries on a regular basis, such as every quarter or after every project. We encourage you to discuss your goals and performance with your manager and to identify your strengths and growth opportunities relative to your role.</p>
</div>

<div id="promoTimeline"></div>
<div class="box">
<h2 id="HTimeline" class="wikigeneratedheader"><span><strong><span style="color: inherit">Timeline</span></strong></span></h2>
<p>The below table outlines the timeline of the promotion document and the dates that must be met throughout the process. Adhering to this timeline allows for at least one review at each stage and builds capacity for a second review if required. This is also allows the reviews panels scope to provide quality feedback at each stage.</p>
<p><strong>Note: The date in this table is the final date for this approval before it moves to the next stage. Any documents that miss the specified action and date will not be considered. Please work backwards and submit in advance of these.</strong></p>
<p><strong>2026 Timeline:</strong></p>
<table class="smile promotimeline styled-table"><tbody><tr><th scope="col">&nbsp;</th><th scope="col">Peer/In-Region ITSM Review</th><th scope="col">L6 Approval</th><th scope="col">Deadline</th></tr><tr><td style="text-align:center"><strong>Q1</strong></td><td style="text-align:center">January 17th</td><td style="text-align:center">January 24th</td><td style="text-align:center">February 14th</td></tr><tr><td style="text-align:center"><strong>Q2</strong></td><td style="text-align:center">May 2nd</td><td style="text-align:center">May 22nd</td><td style="text-align:center">May 29th</td></tr><tr><td style="text-align:center"><strong>Q3</strong></td><td style="text-align:center">July 25th</td><td style="text-align:center">August 22nd</td><td style="text-align:center">August 29th</td></tr><tr><td style="text-align:center"><strong>Q4</strong></td><td style="text-align:center">September TBD</td><td style="text-align:center">TBD</td><td style="text-align:center">TBD</td></tr></tbody></table>
</div>

<div id="promoDocFlowChart"></div>
<div class="box">
<h2 id="HPromoDocFlowChart" class="wikigeneratedheader"><span><strong><span style="color: inherit">Promo Doc Flow Chart</span></strong></span></h2>
<p style="text-align:center"><img src="/wiki-assets/PromoProcess.png" alt="ITS IC Promo Process Flow Chart"></p>
</div>

<div id="itsSuccessTransparency"></div>
<h2 id="HPromotionProcessTransparency"><span><strong><span style="font-size:40px">Promotion Process Transparency</span></strong></span></h2>

<div id="reviewPanelProcess"></div>
<div class="box">
<h2 id="HReviewProcess" class="wikigeneratedheader"><span><strong>Review Process</strong></span></h2>
<p>All candidate assessments are conducted against established levelling guidelines and carefully consider the expanded <a href="https://w.amazon.com/bin/view/ITServices/Support/Internal/Development/GSDCareerGrowthProgram/GSDScopeofRole/">scope</a> and responsibilities of the role</p>
<p><strong>L3&gt;L4</strong></p>
<p>The L3 to L4 promotion process begins when two key criteria are met: there is available promotion capacity at the next level, and the engineer has consistently demonstrated performance at the L4 level as defined in the job levelling guidelines, typically over 2-3 quarters.</p>
<p>Prior to initiating any promotion case, the L6 and promoting manager must align on readiness through structured pre-promotion checkpoints. At these checkpoints, they jointly assess both documentation quality and performance criteria to identify any potential gaps. If gaps are identified, the promoting manager works with the engineer to create and execute a targeted development plan, with specific actions and timelines documented and tracked through <a href="https://atoz.amazon.work/profile/your-growth">Growth Conversations</a>. Only once both managers agree the engineer is tracking successfully should the formal promotion process begin.</p>
<p>The promotion review process continues when the candidate's promotion document is complete and ready for review. Prior to document submission, the promoting manager should ensure all required feedback has been requested and available for review according to the promotion guidelines.</p>
<p>The promoting manager presents the document in a review session with peer managers from the region, who provide feedback and suggestions for improvement. After incorporating feedback and making necessary revisions, the promoting manager presents the finalized promotion document to the L6 manager for decision.</p>
<p>Once the promotion document is reviewed, the L6 manager evaluates the promotion case. If approved, the promotion is processed in the system, and the engineer moves to L4 during the designated promotion quarter.</p>
<p>If the L6 manager does not approve the promotion case, the L6 and promoting manager meet to discuss and align on specific concerns. The promoting manager then meets with the engineer to review feedback and collaboratively develop concrete, actionable steps for moving forward. These actions are integrated into the engineer's Growth Conversations for ongoing tracking and support. All feedback discussions should focus on future growth opportunities rather than dwelling on past gaps.</p>
<p>Throughout the process, promotion progress should be documented in Growth Conversations, with regular updates tracking development against promotion criteria. Engineers should maintain an ongoing <a href="https://w.amazon.com/bin/download/ITServices/Support/Internal/Development/ITSE-Promotion/promo-success-transparency/WebHome/Tracker.xlsx">Impact Tracker</a> to document their wins, key deliverables, and successes. This Impact Tracker serves as both a real-time record of achievements and a valuable source of examples when building the promotion case. Managers should regularly review the Impact Tracker during Growth Conversations to ensure key accomplishments are being captured and aligned with promotion criteria.</p>
</div>

<div id="gsd2ReviewProcess"></div>
<div class="box">
<h3 id="HMovingtoGSD2" class="wikigeneratedheader"><span><strong><span style="color: inherit">Moving to GSD2</span></strong></span></h3>
<p>When capacity becomes available within a regional GSD2 team (hiring L3-L4, but predominantly L4-level), a structured and equitable selection process begins. The GSD2 regional manager initiates a review in partnership with regional managers, maintaining confidentiality throughout the process to ensure appropriate organizational communication.</p>
<p>The evaluation framework assesses L3-L4 engineers based on multiple criteria including sustained performance over the past 3 quarters, recent promotion documentation demonstrating scope and impact, and demonstrated attributes that align with the expanded scope and expectations of the GSD2 role.</p>
<p>When multiple qualified candidates are identified, a structured interview loop assesses readiness for the expanded scope and responsibilities of the GSD2 role. The <a href="https://w.amazon.com/bin/view/ITServices/Support/Internal/Development/GSDCareerGrowthProgram/">GSD Career Foundations</a> wiki provides detailed information about GSD2 role expectations, interview format, and preparation guidelines. Engineers interested in GSD2 opportunities are encouraged to review these resources and discuss their career aspirations during Growth Conversations. The final selection undergoes validation by regional L6 managers to confirm proper process execution and alignment with organizational needs. Only after this validation do discussions begin with selected candidates about potential GSD2 opportunities.</p>
<p>Unlike the standard promotion cycle, GSD2 positions are filled as they become available, ensuring timely staffing of critical roles while maintaining a fair and transparent selection process. This enables continuous team development and maintains operational efficiency within the GSD2 organization. A similar structured and equitable process is followed for identifying and selecting engineers moving into GSD3 roles.</p>
</div>
`;
const HTML_PART2 = `
<div id="itsPerformance"></div>
<h2 id="HPromotionPerformanceTargets"><span><strong><span style="font-size:40px">Promotion Performance Targets</span></strong></span></h2>

<div id="performanceBaseline"></div>
<div class="box">
<h2 id="HITSEPerformanceBaseline" class="wikigeneratedheader"><span><strong>ITSE Performance Baseline</strong></span></h2>
<p>Individual metrics and respective targets define standard performance expectations of GSD employees. You are encouraged to leverage best practices for each KPI to achieve the balance between efficiency and quality. These targets are aligned with Amazon's IT Support model and indicate how we obsess over the customer and Deliver Results while Insisting on the Highest Standards. Note that metrics are reviewed against GSD global averages with additional favorability for results that outperform those comparisons. Employees aiming for promotion should be a role model in demonstrating Amazon's Leadership Principles, providing a quality experience on every contact and exceeding minimum organizational targets.</p>
<p><strong>GSD1</strong></p>
<table border="0" style="background-color:#fff;"><tbody><tr><th style="background-color:#fff;min-width:300px" scope="col"></th><th style="background-color:#fff;" scope="col"></th></tr><tr><td><p>CPH: 2.82 <br>AHT: 21.28<br>CSAT % of 5s: &gt;85%<br>CASE ARR %: &gt;85%<br>Dual Chat Overlap: 18%<br>After Call Work (ACW): &lt;2.00<br>ARR Eligibility Ratio: 75%<br>Transfer Rate %: &lt;5%<br>Contacts Missed %: &lt;5%</p></td><td><p><strong><span style="font-size:16px">Color Range Definitions</span></strong></p><p><img src="/wiki-assets/accept.png" alt="accept"><strong>Green</strong>: Healthy performance; required to support promotion candidacy discussions with your manager.</p><p><img src="/wiki-assets/error.png" alt="error"><strong>Yellow</strong>: Almost Healthy. Slightly behind performance target. Initial discussions with your manager should take place to review this opportunity for improvement. Poses challenges to promotion candidacy discussions.</p><p><img src="/wiki-assets/exclamation.png" alt="exclamation"><strong>Red</strong>: Not Healthy. Unacceptable performance / significantly behind performance target. Improvements required as these detract from promotion candidacy discussions.</p></td></tr></tbody></table>
<p><strong>GSD2</strong></p>
<table border="0" style="background-color:#fff;"><tbody><tr><th style="background-color:#fff;min-width:300px" scope="col"></th><th style="background-color:#fff;" scope="col"></th></tr><tr><td><p>AHT By Channel:</p><ul><li>Escalation: &lt;42:00</li><li>Assist: &lt;22:00</li><li>GSD1 Overflow: &lt;28:00</li><li>Ticketing: &lt;18:00</li></ul><p>CSAT % of 5s: &gt;87%<br>CASE ARR %: &gt;85%<br>After Call Work (ACW): &lt;3.00<br>ARR Eligibility Ratio: 70%<br>Omnia Cards Left Open 1 Hr +: &lt;5%<br>Layer 3 - User Education &amp; Other: &lt;30%<br>Error Messaged populated in Case: &gt;30%<br>Root Cause populated in Case: &gt;70%</p></td><td><p><strong><span style="font-size:16px">Color Range Definitions</span></strong></p><p><img src="/wiki-assets/accept.png" alt="accept"><strong>Green</strong>: Healthy performance; required to support promotion candidacy discussions with your manager.</p><p><img src="/wiki-assets/error.png" alt="error"><strong>Yellow</strong>: Almost Healthy. Slightly behind performance target. Initial discussions with your manager should take place to review this opportunity for improvement. Poses challenges to promotion candidacy discussions.</p><p><img src="/wiki-assets/exclamation.png" alt="exclamation"><strong>Red</strong>: Not Healthy. Unacceptable performance / significantly behind performance target. Improvements required as these detract from promotion candidacy discussions.</p></td></tr></tbody></table>
</div>

<div id="improvePerformance"></div>
<div class="box">
<h3 id="HLinkstoHelpUnderstandandImprovePerformance:" class="wikigeneratedheader"><span><strong>Links to Help Understand and Improve Performance:</strong></span></h3>
<ul>
<li><a href="https://us-east-1.quicksight.aws.amazon.com/sn/account/amazonbi/dashboards/d196d1f9-54ae-43f2-b674-1f5243b714d6">GSD Scorecard</a></li>
<li><a href="https://w.amazon.com/bin/view/ITServices/Support/Internal/LCC/Scorecard/">ITSE Scorecard - KPI Definitions and Standard Expectations</a></li>
<li><a href="https://w.amazon.com/bin/view/ITservices/Content/itsld/gsd-continuing-ed/gsd-learning-paths/">Technical Skill Learning Paths (L&amp;D)</a></li>
<li><a href="https://amazon-mentoring.chronus.com/">Amazon Mentoring Program</a></li>
</ul>
<p><strong>Note:</strong> The <strong>GSD2 Mentorship Program</strong> is another great opportunity to build professional relationships through an organic partnership. This program targets mentorship on areas of opportunity for a mentee to help them grow based on self-identified needs or manager suggestions. Speak with your manager for more information and to confirm availability of GSD2 mentors that align to the identified opportunities and areas of growth.</p>
</div>

<div id="promoRequirements"></div>
<h2 id="HPromotionRequirements"><span><strong><span style="font-size:40px">Promotion Requirements</span></strong></span></h2>

<div id="strongPromoDoc"></div>
<div class="box">
<h2 id="HWhatMakesaStrongPromoDoc3F" class="wikigeneratedheader"><span><strong>What Makes a Strong Promo Doc?</strong></span></h2>
<p>When writing the review using the Star Format (Situation, Task, Action, Result), it is important to base the examples on the scope of the role. Data should also be used in the examples to support the situation and result. The name format for the examples should be the name of achievement in bold, followed bellow by their LP's displayed in italics.</p>

<h3 id="HTheSTARMethod" class="wikigeneratedheader"><span>The STAR Method</span></h3>
<div class="icPromoSTAR">
<div class="STARcontainer SBox"><div class="STARInitial">S</div><div class="STARContents"><h3>Situation<br>20%</h3><p>Explain the situation so that your interviewer understands the context of your example, they do not need to know every detail!</p></div></div>
<div class="STARcontainer TBox"><div class="STARInitial">T</div><div class="STARContents"><h3>Task<br>10%</h3><p>Next, talk about the task, problem, or challenge that you took responsibility for completing, or the goal of your efforts.</p></div></div>
<div class="STARcontainer ABox"><div class="STARInitial">A</div><div class="STARContents"><h3>Action<br>60%</h3><p>Describe the actions that you personally took to complete the task or reach the end goal. Highlight skills or character traits addressed in the question.</p></div></div>
<div class="STARcontainer RBox"><div class="STARInitial">R</div><div class="STARContents"><h3>Result<br>10%</h3><p>Explain the positive outcomes or results of your actions or efforts. Here, it is important to highlight quantifiable results.</p></div></div>
</div>

<h3 id="HWhatGoodLooksLike:" class="wikigeneratedheader"><span>What Good Looks Like:</span></h3>
<div class="panel-group icPromoFAQs">
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ICPromo_EXP1" style="display: inline">Example 1<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_EXP1"><div class="panel-body"><p class="panel-description"><strong>Making Great Hiring Decisions</strong> <strong>#</strong><em>hire and develop the best</em> <strong>#</strong><em>insist on highest standards</em><br>Due to the shift to remote work and an increased demand for IT support, the organization needed to expand its IT support team. The hiring process was critical as SLAs were low, impacting overall metrics and customer experience. To address this, a strong hiring team was established in the XYZ site.<br>Employee XYZ was selected to become an interviewer, thanks to their excellent communication skills and strong evaluation abilities. XYZ was tasked with conducting interviews for the position of IT Services Support Specialist - L3 at the XYZ site.<br>Employee XYZ has already participated in 13 phone screens and 21 on-site interviews, providing valuable feedback during debriefs and helping to hire top talent that aligns with the company's leadership principles. XYZ remains actively involved in talent recruitment in the XYZ site.</p></div></div></div>
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ICPromo_EXP2" style="display: inline">Example 2<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_EXP2"><div class="panel-body"><p class="panel-description"><strong>Ticket as a channel (TAAC) training.</strong> <strong>#</strong><em>Hire and develop the best</em> <strong>#</strong><em>Earn trust</em><br>A new project has been introduced to IT Services called "Ticket as a Channel" in 2021. The scope of this project was to introduce engineers with a new approach, working on live tasks and handling tickets as live contacts in Omnia. Ticket as a Channel will route tickets in a live approach so customers get their issues routed to the first engineer available or the previous engineer who handled their existing ticket based on engineer's availability, and priority defined by Workforce Management (WFM)<br>Employee XYZ received training on handling tickets through Omnia and quickly assimilated the information. Within two weeks of hands-on experience with TAAC, XYZ took on a leadership role by passing along their knowledge to their colleagues. This included providing 4 training sessions and participating in Q&amp;A discussions.<br>As a result of XYZ's efforts, 16 engineers from the EMEA region participated in these training sessions and went on to work on their TaaC profile. This led to a reduction in the number of tickets in the queue, with 8160 tasks being handled by EMEA engineers so far. Most of these engineers received training from Employee XYZ, further demonstrating their impact on the team.</p></div></div></div>
</div>
</div>
`;
const HTML_PART3 = `
<div id="writingGuidance"></div>
<div class="box">
<h3 id="HWritingGuidance28TheDo27s29" class="wikigeneratedheader"><span>Writing Guidance (The Do's)</span></h3>
<table class="smile strongPromoDoc styled-table"><tbody><tr><th scope="col">Attributes</th><th scope="col">Explanation/Example</th></tr>
<tr><td>Leadership Principles</td><td>Review this resource to calibrate which behaviors demonstrate strong LP performance. Keep your examples simple and focused. Example: "Recognizing that we lacked customer insight, Alex set up eight focus groups to ensure we made informed decisions. [Bias for Action]"</td></tr>
<tr><td>Metrics</td><td>Replace adjectives and weasel words (nearly all, significantly better) with data; provide relevant benchmarks. Be consistent with how you describe measurable accomplishments. Example: "As a result of Huan's drive to partner with another technical team, we reduced the time spent to perform this task from 3 minutes to 2 minutes."</td></tr>
<tr><td>Contributions</td><td>Use active voice and tie specific actions back to the builder. Articulate each significant task/milestone/tradeoffs of the builder's contribution. Reference Role Leveling Guidelines. Example: "Kendi developed an SOP which defined the scope of repairs and documented standards."</td></tr>
<tr><td>Impact</td><td>Think about broader, scalable impact. How did this effort influence other projects, teams, and organizations? How did it impact AWS? Example: "Due to Rahi's leadership, this feature request became available in a new country in Q1, with more than 5,000 customers benefiting from the time saving efficiency it enabled in the first month."</td></tr>
</tbody></table>

<div class="panel-group strongPromoAccord">
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#strPromoAcc_01" style="display: inline">Promo Doc Excerpt - Version 1 [Good]<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="strPromoAcc_01"><div class="panel-body"><p class="panel-description">A few months after starting on the team, Casey designed a new process for sharing information with our partner teams. After meeting with multiple stakeholders, Casey identified a technical resource and they worked together to design a new process and implement it across the team. This automated process design saves our team many hours per week of manual labor and allows partner teams to receive the data more frequently. This new process has been implemented across four teams in our organization.</p></div></div></div>
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#strPromoAcc_02" style="display: inline">Promo Doc Excerpt – Version 2 [Better]<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="strPromoAcc_02"><div class="panel-body"><p class="panel-description"><strong style="text-align: center !important;"><span style="color:#f7c638">1= Leadership Principles</span> | <span style="color:#4eab58"> 2 = Metrics</span> | <span style="color:#8b2ec7">3 = Contributions</span> | <span style="color:#4981de">4 = Impact</span></strong><br>Upon discovering an inefficient process for information sharing with our partner team, Casey designed and socialized a new process and implemented it three months ahead of schedule.<sup style="color:#4eab58">2</sup> Earlier this year, our central data team was redistributed across the organization, as a result, a data improvement process was reprioritized and our team hurriedly stood up a new process that we've used for the past six months. Once he took on the process, Casey identified the inefficiencies and met with 15 key stakeholders to understand how the data is processed to design a better solution [Learn and Be Curious].<sup><span style="color:#f7c638">1</span> &amp; <span style="color:#8b2ec7">3</span></sup><br>Leveraging their background in process design, Casey identified a technical partner to create an internal tool<sup style="color:#8b2ec7">3</sup> to automate data sharing, delivering key insights to our partner teams every week (vs. biweekly) [Bias for Action, Invent and Simplify].<sup style="color:#f7c638">1</sup> After socializing this design more broadly, Casey implemented this new process which collectively saved 10 hours per week across 3 teams.<sup style="color:#4eab58">2</sup> They also socialized this new process with other Product Managers <sup style="color:#4981de">4</sup> and to date, it has been implemented by 4 other teams, saving 40+ hours across key technical teams in our organization.<sup><span style="color:#4eab58">2</span> &amp; <span style="color:#4981de">4</span></sup></p></div></div></div>
</div>
</div>

<div class="box">
<div id="practicesToAvoid"></div>
<h3 id="HWritingPracticesToAvoid28TheDon2019ts29" class="wikigeneratedheader"><span>Writing Practices To Avoid (The Don'ts)</span></h3>
<table class="smile strongPromoDoc styled-table"><tbody><tr><th scope="col">Attributes</th><th scope="col">Explanation/Example</th></tr>
<tr><td>Leadership Principles</td><td>Avoid listing multiple LPs within one example. Don't feel obligated to use every LP or reference the same LP multiple times.</td></tr>
<tr><td>Metrics</td><td>Refrain from using different metrics to describe the same accomplishment. Be careful not to overwhelm the audience with data.</td></tr>
<tr><td>Contributions</td><td>Avoid passive language and team-level contributions. Example: "The initiative was owned by multiple people across the team."</td></tr>
<tr><td>Impact</td><td>Refrain from only describing impact at the team-level. Don't generalize or hypothesize and keep the impact focused on facts.</td></tr>
</tbody></table>
<div class="downloadBtn"><a href="https://w.amazon.com/bin/download/ITServices/Support/Internal/Development/ITSE-Promotion/templates/WebHome/Write%20a%20stronger%20promo%20doc.pdf" target="_blank"><button class="dlButton">Download PDF</button></a></div>
</div>

<div class="box">
<div id="writingFormat"></div>
<h2 id="HPromotionWritingFormat" class="wikigeneratedheader"><span><strong><span style="color: inherit">Promotion Writing Format</span></strong></span></h2>
<p>The review should utilize the most recent template from IVY's <a href="https://ivy-help-center.talent.a2z.com/article/article-1588363317136-tIHFcdSOF/">Tech IC Promotions by Level</a> page. Direct link to the promotion document template can be found here: <a href="https://ivy-help-center.talent.a2z.com/api/media/document-1575653262611-tDsSkch10/">Tech IC into L3-L5</a>.</p>

<div id="scopeOfRole"></div>
<h3 id="HScopeofRole" class="wikigeneratedheader"><span><strong>Scope of Role</strong></span></h3>
<p>At Amazon, we promote when:</p>
<ul><li>The employee's role is scoped at the next level</li><li>The employee has consistently demonstrated that they will be successful in that role</li><li>There is role available at next level.</li></ul>
<p>The Scope of Role section of the promotion document speaks to the expectations of an employee scoped at the next level. Standardized Scope of Role templates can be found for common level transitions below:</p>

<div class="panel-group icPromoScope">
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#L3" style="display: inline">L3<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="L3"><div class="panel-body"><p class="panel-description">The IT Support Associate II (GSD1) delivers first-line technical support within the Global Service Desk (GSD), providing comprehensive IT assistance through chat, voice, and ticketing channels. The associate manages a portfolio of standard hardware and software solutions, demonstrating proficiency in diagnostics and troubleshooting across Windows, Mac, Customer Service Operating System (CSOS), mobile, and Linux platforms through remote services. All support is delivered following established security protocols and compliance requirements, ensuring the protection of company assets and data while maintaining service excellence.<br><br>Working within defined service level agreements, associates handle technical troubleshooting across enterprise applications, network connectivity, system access, and end-user computing while maintaining detailed documentation. Associates utilize Knowledge-Centered Service KCS methodology and AI-assisted tools to support efficient resolution and knowledge sharing. They identify and propose improvements to Standard Operating Procedures SOPs and support tools to enhance team efficiency and customer experience. Their professional communication skills are essential as they follow established procedures and practices. Using enterprise systems and available resources, they diagnose and resolve standard issues independently, collaborating with GSD2 through Assist when additional expertise is needed, or escalating to GSD2 after exhausting standard troubleshooting steps or when restricted by permission limitations.<br><br>Associates work on a rotating shift schedule, which is determined through a regular shift bidding process and may be subject to change. The frequency of rotation and shift options are based on business needs and may include day, evening, night, and weekend shifts. This flexible scheduling ensures 24/7 coverage to meet service level agreements. The role demands the ability to efficiently manage multiple concurrent support requests through chat channels to maintain service level agreements and deliver timely resolutions. They actively participate in team meetings and collaborate with IT teams and stakeholders. Success in this role requires balancing independent problem-solving with team collaboration, maintaining security awareness, meeting business-defined performance metrics including Customer Satisfaction (CSAT), Average Resolution Rate (ARR), and Average Handle Time (AHT), and consistently delivering exceptional customer experiences while supporting broader organizational objectives.</p></div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#L4" style="display: inline">L4<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="L4"><div class="panel-body"><p class="panel-description">The IT Support Engineer I (GSD) advances technical problem-solving and system optimization for Amazon's corporate customers across the enterprise environment. Operating with elevated system permissions, this role requires experience in complex troubleshooting across enterprise systems and the ability to resolve issues that may not yet have Standard Operating Procedures (SOPs). The IT Support Engineer I will execute problem-solving within established frameworks, managing technical decisions and escalation paths while evaluating and prioritizing based on business impact and SLAs. This engineer will lead complex troubleshooting across enterprise systems, making informed resource and time allocation decisions based on severity, timeframe, and work volume. They independently determine when to resolve issues or appropriately delegate to colleagues or specialized teams.<br><br>Core responsibilities include creating and maintaining technical documentation and guides, implementing solutions and establishing best practices, and providing technical advisory and support across Amazon's global infrastructure. They will support operational excellence and service delivery while handling complex technical situations and deviations from SOPs, demonstrating sound judgment in escalation decisions. The engineer will train and onboard new team members and drive day-to-day performance improvements, supporting the continuous growth of the GSD team. They demonstrate excellence in stakeholder management through driving clear documentation and cross-regional communications, leading technical meetings, and presenting decisions and updates to leadership. Their ability to drive constructive technical discussions and ask purposeful questions advances business objectives.<br><br>Success requires building effective cross-team collaborations while driving process efficiency and knowledge sharing initiatives. The role emphasizes driving representation and equity in technical teams and incorporating diverse perspectives in solutions. They will identify and address operational gaps while maintaining focus on customer satisfaction and service excellence. This position demands both technical expertise and leadership capabilities, measured through system improvements, operational efficiency, and stakeholder satisfaction. The engineer's commitment to inclusive solutions for all users and ability to challenge status quo for positive change strengthens GSD's continuous improvement and professional development culture.</p>
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#GSD2" style="display: inline">GSD2<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="GSD2"><div class="panel-body"><p class="panel-description">The IT Support Engineer I (GSD2) advances technical problem-solving and system optimization across Amazon's enterprise environment, operating with elevated system permissions to resolve complex issues that may extend beyond established Standard Operating Procedures (SOPs). They independently manage technical decisions and escalation paths, evaluating priorities based on business impact and service level agreements.<br><br>Working within the Global Service Desk framework, engineers perform advanced troubleshooting across enterprise systems including Active Directory, networking infrastructure, cloud services, enterprise security tools, and business-critical applications. They analyse system logs, perform root cause analysis, and implement solutions. They support incidents by extracting and analyzing hardware logs and work closely with service owners during investigation and root cause analysis. Their role includes creating and maintaining technical documentation, providing advisory support across to GSD1, training new team members, and driving operational improvements. They lead technical meetings, manage cross-regional communications, and present updates to leadership.<br><br>Engineers work collaboratively across teams to drive process efficiency and knowledge sharing initiatives while maintaining focus on customer satisfaction. They work on a rotating shift schedule, determined through a regular shift bidding process, with options including day, evening, night, and weekend shifts to ensure 24/7 coverage for service level agreements. Success in this role requires demonstrating both technical expertise and leadership capabilities, measured through system improvements, operational efficiency, and stakeholder satisfaction. They contribute to GSD's continuous improvement culture by developing inclusive solutions and maintaining service excellence through constructive technical discussions and cross-team partnerships</p></div></div></div>
</div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#L5" style="display: inline">L5<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="L5"><div class="panel-body"><p class="panel-description">The IT Support Engineer II (ITSE II) serves as a technical and strategic leader within Amazon's Global Service Desk, combining advanced IT infrastructure expertise with project management capabilities. As a Knowledge Domain Expert (KDE), they lead complex problem management initiatives impacting the entire employee experience, performing root cause analysis and developing workarounds during critical situations. Their writing skills and technical expertise drive organizational impact aligned to business goals, such as contact reduction through problem management deep dives and improved cost to serve metrics through operational excellence initiatives.<br><br>Operating across GSD3, GSD-Experience, and GSD-Operational Excellence Teams, engineers develop and implement technical solutions while managing multiple concurrent projects spanning regional locations. They create and optimize Standard Operating Procedures using Knowledge Centered Service (KCS) methodology, conduct content audits, and collaborate with teams including ITOPM, L&amp;D, and Enterprise Engineering. Their technical proficiency includes software/scripting languages and AWS technologies, which they apply to automate tasks and improve software tools. They plan and coordinate complex change management processes, develop templates, and audit work quality of team members and vendors.<br><br>Engineers provide technical mentorship, contribute to hiring processes, and manage stakeholder communications up to three levels above (L8). They own Correction of Errors (COEs) and related action items, creating technical documentation including one-pagers and PR/FAQs. Success is measured through initiative completion, knowledge content quality, efficiency improvements, project timelines, and process optimization results. The ITSE II delivers clear verbal and written communications for executive summaries and operational reviews while balancing immediate technical challenges with long-term strategic objectives to elevate technical standards within the Global Service Desk and broader IT Services organization.</p>
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#GSDE" style="display: inline">GSDE<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="GSDE"><div class="panel-body"><p class="panel-description">The IT Support Engineer II (ITSE II) in the Global Service Desk (GSD) is responsible for serving as a bridge between tactical operations and strategic initiatives on behalf of GSD. As key stakeholders representing GSD, they support a variety of initiative types including new product support launches, product deprecations, and support the creation and implementation of tooling. Their work directly influences global IT service delivery and advances the support capabilities of the broader organization, driving continuous improvement, and customer experience across Amazon's global technology landscape. They have expert knowledge on organizational needs; driving feature needs, documentation, training, and work with service owners and program managers to guide program direction based on GSD need to deliver a positive customer experience.</p></div></div></div>
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#GSD3" style="display: inline">GSD3<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="GSD3"><div class="panel-body"><p class="panel-description">The IT Support Engineer II (ITSE II) serves as a technical and strategic leader within Amazon's Global Service Desk, combining advanced IT infrastructure expertise with project management capabilities. As a Knowledge Domain Expert (KDE), they lead complex problem management initiatives impacting the entire employee experience, performing root cause analysis and developing workarounds during critical situations. In GSD3, engineers handle OnCall responsibilities for high severity tickets within GSD. They act as the last line of escalation on all support requests, understanding when to partner with and escalate to service owners if all other options have been exhausted.<br><br>Engineers develop and implement technical solutions while managing multiple concurrent projects spanning regional locations. Engineers provide technical mentorship, contribute to hiring processes, and manage stakeholder communications up to three levels above (L8). They own Correction of Errors (COEs) and related action items, creating technical documentation including one-pagers and PR/FAQs. The ITSE II delivers clear verbal and written communications for executive summaries and operational reviews while balancing immediate technical challenges with long-term strategic objectives.</p></div></div></div>
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ProcessEngineer" style="display: inline">Process Design Engineer<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ProcessEngineer"><div class="panel-body"><p class="panel-description">The IT Support Engineer II (ITSE II) in a Global Service Desk environment evaluates existing IT service delivery processes and workflows to drive operational excellence through process improvements. The role requires systematic analysis of contact data, service delivery metrics and pattern recognition to identify process bottlenecks and inefficiencies across the Virtual support services that impact engineer and customer productivity. The IT Support Engineer II (ITSE II) designs and implements process improvements using ITIL frameworks, Six Sigma, and Lean methodologies. They architect workflows, create or modify standard operating procedures (SOPs), and coordinate change management initiatives.<br><br>This includes developing transition strategies, managing stakeholder expectations, and ensuring smooth implementation of process improvements across global teams. Success is measured through quantifiable metrics including reduced contact volume, improved engineer efficiency demonstrated through Average Handle Time reduction, enhanced customer satisfaction scores. Additional success indicators include meeting project timelines and maintaining high standards of 1-pagers or PR/FAQs documents for completeness and accuracy.</p></div></div></div>
</div></div></div>
</div>
</div>
`;
const HTML_PART4 = `
<div class="box">
<div id="goodFeedbackProvider"></div>
<h2 id="HGoodFeedbackProvider" class="wikigeneratedheader"><span>Good Feedback Provider</span></h2>
<p>Promotions require feedback providers to support the promotion candidate and confirm their actions demonstrate next level performance. The persons providing feedback will need to write a short supporting narrative about "Reasons to Promote" and "Reasons to Not Promote" the candidate within the Promote Tool, hence they should have adequate exposure to and familiarity with the candidate's sustained performance at the next level. Feedback providers should consist of 4-6 persons whom are at L4 or above for any L3 to L4 promotions. The official feedback request needs to be made through the Amazon Promote Tool found in Ivy but it's recommended to touch base with proposed supporters in advance to confirm they are inclined. These supporters should have sufficient data to provide feedback supporting the promotion and are also required to share potential reasons to not promote.</p>
</div>

<div class="box">
<div id="additionalInformation"></div>
<h2 id="HAdditionalInformation" class="wikigeneratedheader"><span>Additional Information</span></h2>
<p>The following should be included in the "Additional Information" section of the latest promotion template:</p>
<ul>
<li>The last 6-12 months metrics including an explanation of any misses.</li>
<li>The manager should provide feedback on the engineer's performance, with a recommendation of 200 words or less.</li>
<li>Additionally, the manager should share 2-3 examples of positive feedback received by the engineer, such as gestures of appreciation like thank-you emails and messages.</li>
<li>The review should also include a section on rewards and recognition, highlighting the efforts of the engineer.</li>
<li>If there are any relevant links that support the examples given, they should be included as well.</li>
</ul>
</div>

<div id="promoTools"></div>
<h2 id="HPromotionTools"><span><strong><span style="font-size:40px">Promotion Tools</span></strong></span></h2>

<div id="promoDocChecklist"></div>
<div class="box">
<h2 id="HPromotionResources" class="wikigeneratedheader"><span>Promotion Resources</span></h2>
<table border="0" style="background-color:#fff;"><tbody><tr><th style="background-color:#fff;min-width:300px" scope="col"></th><th style="background-color:#fff;" scope="col"></th></tr><tr><td><p><img src="/wiki-assets/promo-checklist.png" alt="Promo Checklist"></p></td><td><p>Below are resources to help you get oriented to the Promotions Process. Resources describe standardized processes that apply across Amazon.</p><ol><li>Review <a href="https://ivy-help-center.talent.a2z.com/article/article-1568200529673-uNp1yrYjr/">Promotions Resources</a> in the Ivy Help Center.</li><li>Review the <a href="https://ivy-help-center.talent.a2z.com/article/article-1588363317136-tIHFcdSOF?ref=share-button/">Tech Promotions Overview</a> article in Ivy.</li><li>Visit the <a href="https://ivy-help-center.talent.a2z.com/article/1LtjogeLeHXuBP0yNLyg84/">Write the Promotion Document</a> in Ivy to learn more about how to write a promotion document.</li><li>Explore the <a href="https://w.amazon.com/bin/view/CGAP/templates/">CGAP (Career Gap Analysis Product) Template Tool</a> which aims to bridge the gap between your current level and the next or your current role and your desired role. CGAP helps you and your manager identify those gaps, then provides the tools to bridge them! Learn more by watching the <a href="https://broadcast.amazon.com/videos/871089?query=871089&focus=title&match=What+is+CGAP%3F">What is CGAP?</a> Broadcast video.</li></ol><p>Note: You can also review the <a href="https://learn.a2z.com/app/course/amzn1.c3.v2.133e71ad-cc4b-4cc5-a876-eed0736fe20d//">Writing a Promotion Document</a> training module in Learning Genome which while intended for managers, will provide additional insights into the various stages of the promotion process.</p></td></tr></tbody></table>
</div>

<div id="careerRoadmap"></div>
<div class="box">
<h2 id="HCareerRoadmapbyCareerPathways" class="wikigeneratedheader"><span>Career Roadmap by Career Pathways</span></h2>
<p>The career pathways program provides a 7-step continuous growth journey that supports progress on your career goals. The 7 steps are outlined below. Each year, you own and commit to your growth by enrolling in the program. When you enroll, you inform the Org of your interest and commitment to your career growth.</p>
<p>Launch your career growth journey <a href="https://w.amazon.com/bin/view/ITServices/ITSEmployeeResources/ITSCareerPathwaysProgram/CareerGrowthHub/GetStarted/">here</a></p>
</div>

<div id="itsNextLevel"></div>
<h2 id="HNextLevelGuidelines"><span><strong><span style="font-size:40px">Next Level Guidelines</span></strong></span></h2>

<div id="jobDescription"></div>
<div class="box">
<h2 id="HGlobalServiceDesk2" class="wikigeneratedheader"><span>Global Service Desk 2</span></h2>
<p><strong>GSD2 ITSE Job Description:</strong></p>
<p>As a ITS Support Eng I (GSD 2), you carry an elevated technical responsibility focused on providing high-quality support for computer hardware, operating systems, and enterprise application software issues across Amazon's customer base. Your support scope extends beyond individual users or specific groups, encompassing all corporate customers.</p>
<p>You are able to evaluate and prioritize issues based on the severity, time frame, and volume of other expected work, to meet SLAs. You may resolve independently or take the appropriate steps to transfer to the service owner team, as and when required. You connect with customers, while also providing real-time support to peers from GSD1 and On-Prem. You identify possible process improvement areas and outline drivers for change; you support and enhance the ongoing career development of colleagues and represent their team successfully on global and regional initiatives.</p>
<p>You are reflective and evaluative when actions require significant deviation and/or escalation from SOPs, when issues become risks, and when projects hit barriers. You understand and drive constructive technical discussion, asking questions that are appropriate and purposeful to the greater benefit of the business. You are collaborative and goal orientated; you are a skilled problem solver, trusted with a higher level of systems permissions to positively complete tasks to the satisfaction of all customers and stakeholders.</p>
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#L4_Key_Responsibilities" style="display: inline">Key Responsibilities<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="L4_Key_Responsibilities"><div class="panel-body"><p class="panel-description"></p><ul><li><strong>Assist</strong> - You will guide and mentor engineers in troubleshooting, providing assistance and direction for issue resolution, within the Assist queue.</li><li><strong>Escalated contacts</strong> - You will take ownership of escalated issues, resolving complex problems efficiently, and handling permissions-gated issues.</li><li><strong>Executive Support</strong> - You will provide Executive Support for L8+ Customers, through skills-based routing via chat and phone.</li><li><strong>Repeat Contact Resolution</strong> - Responsible for resolving repeat customer issues, auditing initial interactions, and providing feedback to ensure continuous improvement.</li><li><strong>Hiring, training and mentorship</strong> - You will participate in hiring and developing the best individuals, in order to support the continuous growth and improvement of GSD team. You will offer mentorship to support L3 engineers' technical development.</li><li><strong>Process improvement</strong> - You will be involved in continuous improvement efforts to support GSD's king pin goals, supporting projects requiring technical expertise sourced from engineers.</li></ul></div></div></div>
</div>

<div id="levelingGuide"></div>
<div class="box">
<h2 id="HL4JobLevelingGuidelines" class="wikigeneratedheader"><span>L4 Job Leveling Guidelines</span></h2>
<table class="leveling-table"><tbody>
<tr><td><strong>Degree of Ambiguity</strong></td><td>Problem, opportunity, and strategy are defined. Uses knowledge and skill to build, implement, and/or meet assigned goals. Work reviewed periodically. Solutions may need refinement. Needs some guidance.</td></tr>
<tr><td><strong>Scope and Influence</strong></td><td>Works with a team to deliver solutions or a specific workflow. May train new team members.</td></tr>
<tr><td><strong>Execution</strong></td><td>Work is tactical. May create procedures. Learning best practices. Able to troubleshoot with no procedure. Escalates roadblocks and risks. Makes trade-offs: time vs. resources.</td></tr>
<tr><td><strong>Problem Complexity</strong></td><td>Handles straightforward business and/or technology problems.</td></tr>
<tr><td><strong>Communication</strong></td><td>Is clear and concise in verbal and written communication by documenting issues and communicating effectively by conveying ideas and reasoning and following up with dialogue when needed. Learning to be clear and concise in verbal and written communication (e.g., narratives, WBR/MBR). May participate in business reviews (e.g., WBR/MBR). Manages meetings effectively. Learning to put the right people in the room. Is trusted to present decisions to leaders up to 3 tiers above level (L7). Learning to communicate across an increasing diversity of locales and roles.</td></tr>
<tr><td><strong>Impact</strong></td><td>Impacts team metrics.</td></tr>
<tr><td><strong>Process Improvement</strong></td><td>Contributes to operational excellence procedures.</td></tr>
<tr><td><strong>Diversity, Equity, &amp; Inclusion (DEI)</strong></td><td>Seeks and/or supports representation and equity for marginalized voices within organizational systems, assessing barriers to authentic contribution or participation. Demonstrates a willingness to challenge the status quo. Learning to build products and services to benefit those on the margins and minimizing the ways products and services may perpetuate inequity.</td></tr>
</tbody></table>
</div>

<div id="expectationsPostPromotion"></div>
<div class="box">
<h2 id="HExpectationsforPost-Promotion" class="wikigeneratedheader"><span>Expectations for Post-Promotion</span></h2>
<p>These include but are not limited to:</p>
<ul>
<li>Changing teams and managers</li>
<li>Business &amp; Job Title Updates</li>
<li>Routing Profile Updates</li>
<li>Permission Group Updates</li>
<li>Participating in L&amp;D-led GSD2 Training</li>
<li>Participating in GSD2 team meetings</li>
</ul>
<p>Note: Engineers will typically continue working their current schedule post-promotion. During the L&amp;D training ramp-up period, a temporary schedule change may be requested to form a training cohort for Instructor-led Training purposes. After training, the engineer's previous schedule will resume until the next GWP Shift Bid event.</p>
</div>

<div id="guestSpeakerSeries"></div>
<div class="box">
<h2 id="HRecordedGuestSpeakerSessionswithFormerPromotees" class="wikigeneratedheader"><span>Recorded Guest Speaker Sessions with Former Promotees</span></h2>
<div class="speaker-grid">
<div class="speaker-card"><h4>Fernando Zuniga</h4><div class="speaker-title">SET Program Team - ITSE</div><div class="speaker-date">Oct 27th</div><a href="https://broadcast.amazon.com/embed/671348" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Connor Wright</h4><div class="speaker-title">GSD - ITSE (L3 &gt; L4 Promo)</div><div class="speaker-date">Jan 27, 2023</div><a href="https://broadcast.amazon.com/embed/694531" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Kyle Miller</h4><div class="speaker-title">ITS AV Support Eng I (OAV)</div><div class="speaker-date">Jun 22nd, 2023</div><a href="https://broadcast.amazon.com/embed/813407" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Boxuan Tan</h4><div class="speaker-title">ITS Support Eng I (ONS)</div><div class="speaker-date">Jun 29th, 2023</div><a href="https://broadcast.amazon.com/embed/813428" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Geeta Sharma</h4><div class="speaker-title">ITS Support Eng II OPS (GSD2)</div><div class="speaker-date">Jul 31, 2023</div><a href="https://broadcast.amazon.com/embed/838975" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Omar Rezk</h4><div class="speaker-title">ITS Support Eng I ATS (GSD2)</div><div class="speaker-date">Aug 29, 2023</div><a href="https://broadcast.amazon.com/embed/864986" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Luis Chaveiro</h4><div class="speaker-title">ITS Support Eng I (GSD1)</div><div class="speaker-date">Sep 14, 2023</div><a href="https://broadcast.amazon.com/embed/894113" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Islam Mostafa</h4><div class="speaker-title">ITS Support Eng I (GSD1)</div><div class="speaker-date">Sep 21, 2023</div><a href="https://broadcast.amazon.com/embed/894168" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Lisa Henry</h4><div class="speaker-title">ITS Support Eng II (GSD2)</div><div class="speaker-date">Oct 17, 2023</div><a href="https://broadcast.amazon.com/embed/909304" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Patricia Hutson</h4><div class="speaker-title">ITS Support Eng I (GSD1)</div><div class="speaker-date">Jan 5th, 2024</div><a href="https://broadcast.amazon.com/embed/1001953" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Justin Stevens</h4><div class="speaker-title">ITS Support Eng I (GSD1)</div><div class="speaker-date">Jan 18, 2024</div><a href="https://broadcast.amazon.com/embed/1008271" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Carlos Ortega</h4><div class="speaker-title">ITS Support Eng I (GSD1)</div><div class="speaker-date">Jan 12, 2024</div><a href="https://broadcast.amazon.com/embed/1011483" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Bradly Miranda</h4><div class="speaker-title">ITS Support Eng II (GSD1)</div><div class="speaker-date">Feb 23, 2024</div><a href="https://broadcast.amazon.com/embed/1072257" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Ersem Can Binboga</h4><div class="speaker-title">IT Support Eng I (ONS)</div><div class="speaker-date">Mar 7, 2024</div><a href="https://broadcast.amazon.com/embed/1095545" target="_blank">Broadcast Video</a></div>
<div class="speaker-card"><h4>Brian Wood</h4><div class="speaker-title">ITS Support Eng II (COS)</div><div class="speaker-date">Apr 14, 2024</div><a href="https://broadcast.amazon.com/embed/1167213" target="_blank">Broadcast Video</a></div>
</div>
</div>
`;
const HTML_PART5 = `
<div id="promoFAQs"></div>
<h2 id="HFAQs"><span><strong><span style="font-size:40px">FAQs</span></strong></span></h2>
<div class="box">
<div class="panel-group icPromoFAQs">
<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle" href="#ICPromo_FAQ_01" style="display: inline">What are the general criteria required for promotion?<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_FAQ_01"><div class="panel-body"><p class="panel-description">We promote when the employee's role is scoped at the next level, the employee has consistently demonstrated next-level performance and there is role available at next level.</p></div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle" href="#ICPromo_FAQ_02" style="display: inline">How do I express my interest in a promotion?<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_FAQ_02"><div class="panel-body"><p class="panel-description">Speak with your manager during your GROW 1:1 meetings. Your manager should identify any gaps in your performance at current level and articulate any areas where you need to work. You should have examples and data to support that you have been performing at the next level to align on your readiness.</p></div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ICPromo_FAQ_03" style="display: inline">What steps are involved for a promotion process?<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_FAQ_03"><div class="panel-body"><p class="panel-description">Upon aligning with your manager on your readiness for promotion, they will begin writing the promotion document. Your manager may require additional context and data points on your accomplishments and contributions to show impact and next level performance. Once drafted, the doc will be reviewed by multiple review panels and teams including a regional promo panel, GSD2 panel, an L6 Regional Mgr panel, and finally your skip-level manager. As a promotion document moves through the process, your manager may require additional data. In addition to the promotion document, feedback providers are also required to provide short narratives for reasons to and not to promote.</p></div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ICPromo_FAQ_04" style="display: inline">How often do promotion opportunities become available?<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_FAQ_04"><div class="panel-body"><p class="panel-description">Promotion evaluations take place quarterly. It is suggested to begin drafting a promotion document well in advance of the targeted promo quarter to allow time for your promotion document to receive feedback, perform revisions, and allow feedback providers sufficient time to write their narratives.</p></div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ICPromo_FAQ_05" style="display: inline">What specific skills or experience should I focus on developing to be a strong candidate for a promotion?<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_FAQ_05"><div class="panel-body"><p class="panel-description">To show promotion readiness, you should possess strong metrics, positive LP behaviours, delivered impact in your accomplishments, and have examples of demonstrating the job role guideline with consistency. Examples showing impact beyond a single team, solving issues upstream or at scale, working with partner teams, and leading initiatives are great experiences to have and showcase skills in action.</p></div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ICPromo_FAQ_06" style="display: inline">How can I demonstrate initiative and take on projects aligned with my skills needed to level up?<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_FAQ_06"><div class="panel-body"><p class="panel-description">Work with your peers and manager to express interest in topics that align to your strengths and share ideas for improving areas that would make an impact for the organization. If you observe something that should be improved or fixed, discuss the opportunity with your manager and peers to explore if the topic is already being addressed and could use help or propose new projects based on your strengths and past experiences.</p></div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ICPromo_FAQ_07" style="display: inline">What is the process of requesting feedback on my performance with regards to promotion readiness?<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_FAQ_07"><div class="panel-body"><p class="panel-description">These discussions should take place with your manager during your GROW 1:1 meetings. Your manager should identify any gaps in your performance at current level, and articulate any areas where you need to work. They should work with you to create development plans and also share ratings on your monthly performance.</p></div></div></div>

<div class="panel panel-default"><div class="panel-heading"><h4 class="panel-title"><a class="accordion-toggle collapsed" href="#ICPromo_FAQ_08" style="display: inline">If I'm not selected for a promotion, what resources are available to create my development plan for the future promotion?<span style="float:right;"><sub><em>+</em></sub></span></a></h4></div>
<div class="panel-collapse collapse" id="ICPromo_FAQ_08"><div class="panel-body"><p class="panel-description">Work with your manager to form an updated GROW plan and goals to demonstrate promotion readiness. In addition to your growth discussions, review the resources and content shared on the ITS Promotion Process wiki to improve the promotion document and narrative. Use previously identified areas of opportunity as topics to demonstrate growth and improvement in.</p></div></div></div>
</div>
</div>
`;

const HTML_CONTENT = HTML_PART1 + HTML_PART2 + HTML_PART3 + HTML_PART4 + HTML_PART5;

export default function GuidelinesPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const { guidelinesRead, markGuidelinesRead } = useOnboarding();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (guidelinesRead || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { markGuidelinesRead(); observer.disconnect(); } },
      { threshold: 0.5 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [guidelinesRead, markGuidelinesRead]);

  useEffect(() => {
    if (guidelinesRead) return;
    const timer = setTimeout(() => setShowFallback(true), 30000);
    return () => clearTimeout(timer);
  }, [guidelinesRead]);

  useEffect(() => {
    if (!containerRef.current) return;
    // Fix all accordion links: remove href to prevent navigation, add cursor
    const links = containerRef.current.querySelectorAll('.accordion-toggle');
    links.forEach(link => {
      link.removeAttribute('href');
      (link as HTMLElement).style.cursor = 'pointer';
    });
    // Bind click to panel-heading for large click target
    const headings = containerRef.current.querySelectorAll('.panel-heading');
    const handlers: Array<[Element, (e: Event) => void]> = [];
    headings.forEach(heading => {
      const handler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        const panel = heading.closest('.panel');
        const collapse = panel?.querySelector('.panel-collapse');
        const toggle = heading.querySelector('.accordion-toggle');
        if (collapse) collapse.classList.toggle('in');
        if (toggle) toggle.classList.toggle('collapsed');
      };
      heading.addEventListener('click', handler);
      handlers.push([heading, handler]);
    });
    return () => { handlers.forEach(([el, h]) => el.removeEventListener('click', h)); };
  }, []);

  return (
    <Box>
      <style>{getCSS(dark)}</style>
      <div
        ref={containerRef}
        className="wiki-guidelines-content"
        dangerouslySetInnerHTML={{ __html: HTML_CONTENT }}
      />
      <div ref={sentinelRef} style={{ height: 1 }} />
      {!guidelinesRead && showFallback && (
        <Button variant="outlined" onClick={markGuidelinesRead} sx={{ mt: 2 }}>
          ✅ Mark Guidelines as Read
        </Button>
      )}
    </Box>
  );
}
