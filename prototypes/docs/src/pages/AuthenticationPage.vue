<script setup lang="ts">
import PageShell from '@/components/PageShell.vue';
import DocSection from '@/components/DocSection.vue';
import CodeBlock from '@/components/CodeBlock.vue';
import Callout from '@/components/Callout.vue';
</script>

<template>
  <PageShell title="Authentication" subtitle="Cómo obtener tus credenciales de acceso a la API">
    <DocSection :level="1">Authentication</DocSection>

    <p>
      Para acceder a la API de Ardua necesitás una <code>API_KEY</code> que te enviamos nosotros.
      El proceso toma menos de 24 horas.
    </p>

    <DocSection :level="2">Cómo funciona</DocSection>

    <p>
      Usamos un sistema de claves: vos generás dos claves vinculadas entre sí — una pública y una
      privada. Nos mandás solo la pública, nosotros la usamos para encriptar tu
      <code>API_KEY</code> antes de enviártela. Solo tu clave privada puede abrirla, así
      garantizamos que nadie más pueda leerla en el camino.
    </p>

    <DocSection :level="2">Pasos</DocSection>

    <DocSection :level="3">1. Generá tu par de claves</DocSection>

    <p>
      Si ya tenés un par de claves pública/privada, podés usarlas directamente — pasá al paso 2. Si
      no, generalas con estos comandos. Vas a obtener dos archivos: <code>private.pem</code> (tu
      clave privada, guardala en un lugar seguro) y <code>public.pem</code> (tu clave pública, esta
      es la que nos mandás).
    </p>

    <CodeBlock code="openssl genrsa -out private.pem 4096" language="bash" />
    <div class="h-3" />
    <CodeBlock code="openssl rsa -in private.pem -pubout -out public.pem" language="bash" />

    <DocSection :level="3">2. Envianos tu clave pública</DocSection>

    <p>
      Mandá el archivo <code>public.pem</code> a <strong>product@arduasolutions.com</strong> con el
      nombre de tu empresa. En menos de 48 horas te respondemos con tu <code>API_KEY</code>
      encriptada.
    </p>

    <DocSection :level="3">3. Desencriptá tu API_KEY</DocSection>

    <p>Al recibir nuestra respuesta, usá tu clave privada para desencriptarla:</p>

    <CodeBlock
      code="openssl rsautl -decrypt -inkey private.pem -in api_key.enc -out api_key.txt"
      language="bash"
    />

    <p>
      Tu <code>API_KEY</code> va a quedar en el archivo <code>api_key.txt</code>, lista para usar
      en tus llamadas a la API.
    </p>

    <Callout variant="warning">
      El equipo de Ardua <strong>nunca</strong> te va a pedir tu clave privada. Si alguien lo hace,
      no la compartas y avisanos de inmediato a <strong>product@arduasolutions.com</strong>.
    </Callout>

    <DocSection :level="2">¿Dudas?</DocSection>

    <p>
      Escribinos a <strong>product@arduasolutions.com</strong> — respondemos el mismo día hábil.
    </p>
  </PageShell>
</template>
