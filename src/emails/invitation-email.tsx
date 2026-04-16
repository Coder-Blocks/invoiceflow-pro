import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import * as React from 'react';

interface InvitationEmailProps {
    organizationName: string;
    inviteLink: string;
    role: string;
    invitedBy: string;
}

export const InvitationEmail = ({
    organizationName,
    inviteLink,
    role,
    invitedBy,
}: InvitationEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Join {organizationName} on InvoiceFlow Pro</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>You're Invited!</Heading>
                    <Text style={text}>
                        {invitedBy} has invited you to join <strong>{organizationName}</strong> on InvoiceFlow Pro as a <strong>{role}</strong>.
                    </Text>
                    <Section style={buttonContainer}>
                        <Button style={button} href={inviteLink}>
                            Accept Invitation
                        </Button>
                    </Section>
                    <Text style={text}>
                        This invitation will expire in 7 days.
                    </Text>
                    <Text style={text}>
                        If you didn't expect this invitation, you can safely ignore this email.
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

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '30px 0',
};

const button = {
    backgroundColor: '#3B82F6',
    borderRadius: '5px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    padding: '12px 30px',
};