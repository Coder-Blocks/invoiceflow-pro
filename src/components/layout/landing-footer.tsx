import Link from 'next/link';

export function LandingFooter() {
    return (
        <footer className="border-t bg-muted/50">
            <div className="container py-12 md:py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="font-semibold mb-3">Product</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#features">Features</Link></li>
                            <li><Link href="#pricing">Pricing</Link></li>
                            <li><Link href="/signup">Sign Up</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-3">Company</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#">About</Link></li>
                            <li><Link href="#">Blog</Link></li>
                            <li><Link href="#">Contact</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-3">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#">Privacy</Link></li>
                            <li><Link href="#">Terms</Link></li>
                            <li><Link href="#">Security</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-3">Resources</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#">Help Center</Link></li>
                            <li><Link href="#">API Docs</Link></li>
                            <li><Link href="#">Status</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} InvoiceFlow Pro. All rights reserved.
                </div>
            </div>
        </footer>
    );
}