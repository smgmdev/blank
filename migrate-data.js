import postgres from 'postgres';

// Connect to Neon with SSL
const neonSql = postgres({
  host: process.env.PGHOST,
  port: 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: 'require',
});

// Connect to Supabase
const supabaseSql = postgres(process.env.DATABASE_URL);

async function migrate() {
  try {
    console.log('🔄 Fetching data from Neon...');
    
    const sites = await neonSql`SELECT * FROM wordpress_sites`;
    const users = await neonSql`SELECT * FROM app_users`;
    const articles = await neonSql`SELECT * FROM articles`;
    const publishing = await neonSql`SELECT * FROM article_publishing`;
    const credentials = await neonSql`SELECT * FROM user_site_credentials`;
    const profiles = await neonSql`SELECT * FROM publishing_profiles`;
    const approved = await neonSql`SELECT * FROM approved_wp_users`;
    
    console.log(`✓ Found: ${sites.length} sites, ${users.length} users, ${articles.length} articles`);
    
    console.log('🗑️  Clearing Supabase...');
    await supabaseSql`DELETE FROM publishing_profiles`;
    await supabaseSql`DELETE FROM user_site_credentials`;
    await supabaseSql`DELETE FROM article_publishing`;
    await supabaseSql`DELETE FROM approved_wp_users`;
    await supabaseSql`DELETE FROM articles`;
    await supabaseSql`DELETE FROM app_users`;
    await supabaseSql`DELETE FROM wordpress_sites`;
    
    console.log('📝 Inserting into Supabase...');
    if (sites.length > 0) await supabaseSql`INSERT INTO wordpress_sites ${supabaseSql(sites)}`;
    if (users.length > 0) await supabaseSql`INSERT INTO app_users ${supabaseSql(users)}`;
    if (articles.length > 0) await supabaseSql`INSERT INTO articles ${supabaseSql(articles)}`;
    if (publishing.length > 0) await supabaseSql`INSERT INTO article_publishing ${supabaseSql(publishing)}`;
    if (credentials.length > 0) await supabaseSql`INSERT INTO user_site_credentials ${supabaseSql(credentials)}`;
    if (profiles.length > 0) await supabaseSql`INSERT INTO publishing_profiles ${supabaseSql(profiles)}`;
    if (approved.length > 0) await supabaseSql`INSERT INTO approved_wp_users ${supabaseSql(approved)}`;
    
    console.log('✓ Migration complete!');
    
    const verifySites = await supabaseSql`SELECT COUNT(*) as count FROM wordpress_sites`;
    console.log(`✓ Supabase now has ${verifySites[0].count} sites`);
    
    await neonSql.end();
    await supabaseSql.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exit(1);
  }
}

migrate();
