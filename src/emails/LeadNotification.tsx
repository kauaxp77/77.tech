import {
    Html,
    Head,
    Body,
    Container,
    Text,
    Section,
    Heading,
} from "@react-email/components";
import { Lead } from "@/schemas/lead";

interface Props {
    lead: Lead;
}

export function LeadNotificationEmail({ lead }: Props) {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Novo Lead: 77xp Tech Solutions</Heading>
                    <Text style={text}>
                        Um novo interessado acabou de submeter o formulário de contato.
                    </Text>
                    <Section style={section}>
                        <Text style={item}><b>Nome:</b> {lead.name}</Text>
                        <Text style={item}><b>E-mail:</b> {lead.email}</Text>
                        <Text style={item}><b>Empresa:</b> {lead.company || "Não informado"}</Text>
                        <Text style={item}><b>Telefone:</b> {lead.phone || "Não informado"}</Text>
                        <Text style={item}><b>Tipo de Projeto:</b> {lead.projectType || "Não informado"}</Text>
                        <Text style={item}><b>Origem/Source:</b> {lead.source}</Text>
                    </Section>
                    <Section style={section}>
                        <Heading as="h3" style={h3}>Mensagem Opcional / Desafio:</Heading>
                        <Text style={text}>{lead.message}</Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const main = { backgroundColor: "#050505", fontFamily: "sans-serif", padding: "40px 20px" };
const container = { backgroundColor: "#111", border: "1px solid #333", borderRadius: "12px", padding: "40px", margin: "0 auto", maxWidth: "600px" };
const h1 = { color: "#FFFFFF", fontSize: "24px", margin: "0 0 20px 0" };
const h3 = { color: "#7C4DFF", fontSize: "16px", marginTop: "20px", marginBottom: "10px" };
const text = { color: "#A1A1AA", fontSize: "16px", lineHeight: "1.6", margin: "0" };
const section = { backgroundColor: "#1A1A1A", padding: "20px", borderRadius: "8px", marginTop: "20px", border: "1px solid #222" };
const item = { color: "#FFF", fontSize: "14px", margin: "8px 0" };
