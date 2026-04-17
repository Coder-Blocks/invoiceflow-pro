import { CustomerForm } from '@/components/customers/customer-form';
export default function NewCustomerPage() {
    return (
        <div className="space-y-6">
            <div><h1 className="text-3xl font-bold tracking-tight">New Customer</h1><p className="text-muted-foreground">Add a new client to your workspace.</p></div>
            <CustomerForm />
        </div>
    );
}