import type { Metadata } from 'next';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { BRAND } from '@/lib/brand';
import { landing } from '@/lib/landing-ui';

export const metadata: Metadata = {
    title: 'Developer API — Stepay',
    description: 'Integrate Stepay checkout into your school, shop, or app. Create payment links, receive USDC, and get webhook notifications.',
};

const BASE = 'https://stepay.pro';

function CodeBlock({ children }: { children: string }) {
    return (
        <Box
            component="pre"
            sx={{
                overflow: 'auto',
                borderRadius: 2,
                border: `1px solid ${BRAND.border}`,
                bgcolor: 'rgba(0,0,0,0.35)',
                p: 2.5,
                fontSize: '0.75rem',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.82)',
                fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        >
            {children}
        </Box>
    );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <Box component="section" id={id} sx={{ scrollMarginTop: 96, mb: 6 }}>
            <Typography component="h2" sx={{ ...landing.heading, fontSize: { xs: '1.35rem', md: '1.6rem' }, mb: 2 }}>
                {title}
            </Typography>
            {children}
        </Box>
    );
}

export default function DevelopersPage() {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: BRAND.bg, color: '#fff' }}>
            <LandingHeader />
            <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 5, md: 8 } }}>
                <Typography sx={landing.badge}>Developer API</Typography>
                <Typography component="h1" sx={{ ...landing.heading, fontSize: { xs: '2rem', md: '2.5rem' }, mb: 2 }}>
                    Accept payments in your app
                </Typography>
                <Typography sx={{ ...landing.body, mb: 4, maxWidth: 640 }}>
                    Create checkout sessions from your server, send customers a payment link or embedded widget, and receive{' '}
                    <strong style={{ color: BRAND.accentLight }}>USDC</strong> when they pay via mobile money or Stepay wallet.
                    Webhooks notify your backend when payment succeeds.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 6 }}>
                    <Link href="/signup?next=/dashboard/merchant" style={{ textDecoration: 'none' }}>
                        <Button variant="contained" sx={landing.primaryCta}>
                            Get API keys
                        </Button>
                    </Link>
                    <Link href="#quickstart" style={{ textDecoration: 'none' }}>
                        <Button sx={{ color: BRAND.accent, textTransform: 'none', fontWeight: 600 }}>
                            Quick start ↓
                        </Button>
                    </Link>
                </Stack>

                <Section id="quickstart" title="Quick start">
                    <Typography sx={{ ...landing.body, mb: 2 }}>
                        1. Sign up and open{' '}
                        <Link href="/dashboard/merchant" style={{ color: BRAND.accent }}>
                            Dashboard → Merchant
                        </Link>
                        . Generate an API key — save <code>sk_live_…</code> and <code>whsec_…</code> immediately.
                    </Typography>
                    <Typography sx={{ ...landing.body, mb: 2 }}>
                        2. Create a checkout from your server:
                    </Typography>
                    <CodeBlock>{`curl -X POST ${BASE}/api/v1/checkouts \\
  -H "Authorization: Bearer sk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 25,
    "asset": "usdc",
    "label": "School fees — Term 2",
    "reference": "STU-1042",
    "success_url": "https://yoursite.com/thank-you",
    "webhook_url": "https://yoursite.com/hooks/stepay"
  }'`}</CodeBlock>
                    <Typography sx={{ ...landing.body, mt: 2, mb: 2 }}>
                        3. Redirect the customer to <code>checkout_url</code> from the response, or embed it (see below).
                    </Typography>
                    <Typography sx={{ ...landing.body }}>
                        4. Listen for the <code>checkout.paid</code> webhook on your server to mark the order paid.
                    </Typography>
                </Section>

                <Section id="auth" title="Authentication">
                    <Typography sx={{ ...landing.body, mb: 2 }}>
                        Send your secret API key on every request. Keys start with <code>sk_live_</code>.
                    </Typography>
                    <CodeBlock>{`Authorization: Bearer sk_live_...
# or
X-Stepay-Key: sk_live_...`}</CodeBlock>
                    <Typography sx={{ ...landing.body, mt: 2 }}>
                        Never expose your API key in browser JavaScript. Create checkouts from your backend only.
                    </Typography>
                </Section>

                <Section id="create-checkout" title="POST /api/v1/checkouts">
                    <Typography sx={{ ...landing.body, mb: 2 }}>Create a one-time payment session.</Typography>
                    <Typography sx={{ ...landing.sectionLabel, mb: 1 }}>Request body</Typography>
                    <CodeBlock>{`{
  "amount": 25,              // required — min 1 USDC or 0.1 XLM
  "asset": "usdc",           // "usdc" (default) or "xlm"
  "label": "Invoice #1042",  // required — shown to payer
  "description": "Optional longer text",
  "reference": "INV-1042",   // your order id (also accepts referenceId)
  "metadata": { "order_id": "1042" },
  "success_url": "https://yoursite.com/done",   // HTTPS only
  "cancel_url": "https://yoursite.com/cancel",  // optional
  "webhook_url": "https://yoursite.com/hooks/stepay",
  "expires_in_minutes": 1440  // 15–10080, default 24h
}`}</CodeBlock>
                    <Typography sx={{ ...landing.sectionLabel, mb: 1, mt: 3 }}>Response</Typography>
                    <CodeBlock>{`{
  "id": "uuid",
  "checkout_token": "hex32",
  "amount": 25,
  "asset": "usdc",
  "label": "Invoice #1042",
  "status": "pending",
  "expires_at": "2026-07-06T18:00:00.000Z",
  "checkout_url": "${BASE}/pay/checkout/{token}",
  "embed_url": "${BASE}/pay/checkout/{token}?embed=1"
}`}</CodeBlock>
                </Section>

                <Section id="get-checkout" title="GET /api/v1/checkouts/:id">
                    <Typography sx={{ ...landing.body, mb: 2 }}>Poll checkout status by UUID.</Typography>
                    <CodeBlock>{`curl ${BASE}/api/v1/checkouts/CHECKOUT_UUID \\
  -H "Authorization: Bearer sk_live_..."`}</CodeBlock>
                    <Typography sx={{ ...landing.body, mt: 2 }}>
                        Status values: <code>pending</code>, <code>paid</code>, <code>expired</code>, <code>cancelled</code>.
                    </Typography>
                </Section>

                <Section id="list-checkouts" title="GET /api/v1/checkouts">
                    <Typography sx={{ ...landing.body, mb: 2 }}>List your 30 most recent checkouts.</Typography>
                    <CodeBlock>{`curl ${BASE}/api/v1/checkouts \\
  -H "Authorization: Bearer sk_live_..."`}</CodeBlock>
                </Section>

                <Section id="webhooks" title="Webhooks">
                    <Typography sx={{ ...landing.body, mb: 2 }}>
                        When a checkout is paid, Stepay POSTs to your <code>webhook_url</code> with event{' '}
                        <code>checkout.paid</code>.
                    </Typography>
                    <Typography sx={{ ...landing.sectionLabel, mb: 1 }}>Payload</Typography>
                    <CodeBlock>{`{
  "event": "checkout.paid",
  "checkoutId": "uuid",
  "checkoutToken": "hex32",
  "referenceId": "STU-1042",
  "amount": 25,
  "asset": "usdc",
  "txHash": "stellar-transaction-hash",
  "payerId": "user-uuid-or-null",
  "paymentMethod": "wallet",
  "paidAt": "2026-07-05T18:00:00.000Z",
  "metadata": { "order_id": "1042" }
}`}</CodeBlock>
                    <Typography sx={{ ...landing.sectionLabel, mb: 1, mt: 3 }}>Verify signature (Node.js)</Typography>
                    <CodeBlock>{`import { createHmac, timingSafeEqual } from 'crypto';

function verifyStepayWebhook(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.trim().split('='))
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  const signed = \`\${timestamp}.\${rawBody}\`;
  const actual = createHmac('sha256', secret).update(signed).digest('hex');
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

// Express example:
app.post('/hooks/stepay', express.raw({ type: 'application/json' }), (req, res) => {
  const raw = req.body.toString('utf8');
  const sig = req.headers['stepay-signature'];
  if (!verifyStepayWebhook(raw, sig, process.env.STEPAY_WEBHOOK_SECRET)) {
    return res.status(401).send('invalid signature');
  }
  const event = JSON.parse(raw);
  if (event.event === 'checkout.paid') {
    // mark order paid using event.referenceId
  }
  res.sendStatus(200);
});`}</CodeBlock>
                    <Typography sx={{ ...landing.body, mt: 2 }}>
                        Header format: <code>Stepay-Signature: t=UNIX_SECONDS,v1=HEX_HMAC</code>. Use the{' '}
                        <code>whsec_…</code> secret from the same API key that created the checkout.
                    </Typography>
                </Section>

                <Section id="embed" title="Embed checkout">
                    <Typography sx={{ ...landing.body, mb: 2 }}>
                        Add an inline payment widget to your site (iframe). Put the container before the script:
                    </Typography>
                    <CodeBlock>{`<div data-stepay-embed="${BASE}/pay/checkout/CHECKOUT_TOKEN"></div>
<script src="${BASE}/embed.js" defer></script>`}</CodeBlock>
                    <Typography sx={{ ...landing.body, mt: 2, mb: 2 }}>
                        Or open checkout in a popup button:
                    </Typography>
                    <CodeBlock>{`<a href="${BASE}/pay/checkout/TOKEN"
   data-stepay-checkout="${BASE}/pay/checkout/TOKEN"
   class="stepay-pay-btn">Pay with Stepay</a>
<script src="${BASE}/embed.js" defer></script>`}</CodeBlock>
                </Section>

                <Section id="errors" title="Errors">
                    <Typography sx={{ ...landing.body, mb: 2 }}>
                        Errors return JSON <code>{`{ "error": "message" }`}</code> with HTTP status:
                    </Typography>
                    <Box component="ul" sx={{ ...landing.body, pl: 3, '& li': { mb: 1 } }}>
                        <li>
                            <strong>401</strong> — missing or invalid API key
                        </li>
                        <li>
                            <strong>400</strong> — invalid amount, label, URL, or expired checkout
                        </li>
                        <li>
                            <strong>404</strong> — checkout not found
                        </li>
                    </Box>
                </Section>

                <Section id="node-example" title="Full Node.js example">
                    <CodeBlock>{`const API_KEY = process.env.STEPAY_API_KEY;
const BASE = '${BASE}';

async function createCheckout(order) {
  const res = await fetch(\`\${BASE}/api/v1/checkouts\`, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: order.totalUsdc,
      asset: 'usdc',
      label: order.title,
      reference: order.id,
      metadata: { order_id: order.id },
      success_url: \`https://shop.example.com/orders/\${order.id}/thanks\`,
      webhook_url: 'https://shop.example.com/hooks/stepay',
    }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

// Usage:
// const { checkout_url } = await createCheckout({ id: '1042', title: 'Fees', totalUsdc: 25 });
// redirect customer to checkout_url`}</CodeBlock>
                </Section>

                <Box sx={{ ...landing.panel, p: 3, mt: 4 }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>Need API keys?</Typography>
                    <Typography sx={{ ...landing.body, mb: 2 }}>
                        Create them in your merchant dashboard after signing up. Test with small amounts first.
                    </Typography>
                    <Link href="/dashboard/merchant" style={{ textDecoration: 'none' }}>
                        <Button variant="contained" sx={landing.primaryCta}>
                            Open merchant dashboard
                        </Button>
                    </Link>
                </Box>
            </Container>
        </Box>
    );
}
