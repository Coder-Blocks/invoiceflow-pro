'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/bank-transactions', { method: 'POST', body: formData });
        if (res.ok) {
            const data = await res.json();
            toast.success(`Imported ${data.imported} transactions`);
            router.push('/dashboard/reconciliation');
        } else {
            toast.error('Failed to import CSV');
        }
        setUploading(false);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Import Bank Statement</CardTitle>
                    <CardDescription>
                        Upload a CSV file containing your bank transactions. Expected columns: Date, Description, Amount, Reference (optional).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="file">CSV File</Label>
                            <div className="flex items-center gap-4">
                                <Input id="file" type="file" accept=".csv" onChange={handleFileChange} className="flex-1" />
                                {file && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <FileText className="h-4 w-4" /> {file.name}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                CSV format: Date (YYYY-MM-DD), Description, Amount (positive for inflow, negative for outflow), Reference (optional)
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={!file || uploading}>
                                {uploading ? 'Importing...' : <><Upload className="mr-2 h-4 w-4" /> Import</>}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}