import {
    Body,
    Container,
    Column,
    Head,
    Heading,
    Html,
    Preview,
    Row,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface ReminderEmailProps {
    customerName: string;
    invoiceNumber: string;
    dueDate: Date;
    total: number;
    organizationName: string;
    body: string;
}

export const ReminderEmail = ({
    customerName,
    invoiceNumber,
    dueDate,
    total,
    organizationName,
    body,
}: ReminderEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Payment Reminder for Invoice {invoiceNumber}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Payment Reminder</Heading>
                    <Text style={text}>Dear {customerName},</Text>
                    <Text style={text}>{body}</Text>
                    <Section style={details}>
                        <Row>
                            <Column style={label}>Invoice Number:</Column>
                            <Column style={value}>{invoiceNumber}</Column>
                        </Row>
                        <Row>
                            <Column style={label}>Due Date:</Column>
                            <Column style={value}>{dueDate.toLocaleDateString()}</Column>
                        </Row>
                        <Row>
                            <Column style={label}>Amount Due:</Column>
                            <Column style={value}>${total.toFixed(2)}</Column>
                        </Row>
                    </Section>
                    <Text style={text}>
                        Thank you for your business!
                        <br />
                        {organizationName}
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
};

const h1 = {
    color: '#333',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '40px 0',
    padding: '0',
};

const text = {
    color: '#333',
    fontSize: '16px',
    lineHeight: '24px',
};

const details = {
    padding: '20px',
    backgroundColor: '#f4f4f4',
    borderRadius: '4px',
    margin: '20px 0',
};

const label = {
    fontWeight: 'bold',
    width: '150px',
};

const value = {
    textAlign: 'right' as const,
};