import { Router } from 'express';
import { AuthRequest } from '../auth.js';
import PDFDocument from 'pdfkit';
import { executeQuery } from '../config/database.js';
import { authenticateToken, requireManager } from './auth.js';

const router = Router();

// Obtenir le rapport journalier d'un restaurant
router.get('/:restaurantId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { date } = req.query;
    const user = (req as AuthRequest).user;

    // Vérifier l'accès
    if (user.role === 'manager' && user.restaurant_id !== parseInt(restaurantId)) {
      return res.status(403).json({ error: 'Accès non autorisé à ce restaurant' });
    }

    const reportDate = (date as string) || new Date().toISOString().split('T')[0];

    // Récupérer les données du rapport
    const orders = await executeQuery(`
      SELECT o.id, o.order_number, o.created_at, o.payment_method, o.total_amount,
             oi.quantity, oi.unit_price, oi.total_price,
             p.name as product_name, p.type as product_type, p.drink_category,
             u.username as manager_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.manager_id = u.id
      WHERE o.restaurant_id = ? AND DATE(o.created_at) = ?
      ORDER BY o.created_at ASC, o.id, oi.id
    `, [restaurantId, reportDate]);

    // Calculer les totaux
    const cashTotal = orders
      .filter(order => order.payment_method === 'cash')
      .reduce((sum, order) => sum + order.total_price, 0);

    const electronicTotal = orders
      .filter(order => order.payment_method === 'electronic')
      .reduce((sum, order) => sum + order.total_price, 0);

    const grandTotal = cashTotal + electronicTotal;

    // Statistiques additionnelles
    const stats = {
      total_orders: [...new Set(orders.map(o => o.id))].length,
      total_items: orders.reduce((sum, order) => sum + order.quantity, 0),
      average_order_value: grandTotal / Math.max([...new Set(orders.map(o => o.id))].length, 1),
      cash_percentage: grandTotal > 0 ? (cashTotal / grandTotal) * 100 : 0,
      electronic_percentage: grandTotal > 0 ? (electronicTotal / grandTotal) * 100 : 0
    };

    res.json({
      date: reportDate,
      restaurant_id: parseInt(restaurantId),
      orders,
      totals: {
        cash: cashTotal,
        electronic: electronicTotal,
        total: grandTotal
      },
      statistics: stats
    });

  } catch (error) {
    console.error('Erreur génération rapport:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
  }
});

// Exporter le rapport en PDF
router.get('/:restaurantId/pdf', authenticateToken, requireManager, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { date } = req.query;
    const user = (req as AuthRequest).user;

    // Vérifier l'accès
    if (user.role === 'manager' && user.restaurant_id !== parseInt(restaurantId)) {
      return res.status(403).json({ error: 'Accès non autorisé à ce restaurant' });
    }

    const reportDate = (date as string) || new Date().toISOString().split('T')[0];

    // Récupérer les informations du restaurant
    const restaurant = await executeQuery(
      'SELECT name, location FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (!restaurant || restaurant.length === 0) {
      return res.status(404).json({ error: 'Restaurant non trouvé' });
    }

    // Récupérer les données du rapport
    const orders = await executeQuery(`
      SELECT o.id, o.order_number, o.created_at, o.payment_method, o.total_amount,
             oi.quantity, oi.unit_price, oi.total_price,
             p.name as product_name, p.type as product_type, p.drink_category,
             u.username as manager_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.manager_id = u.id
      WHERE o.restaurant_id = ? AND DATE(o.created_at) = ?
      ORDER BY o.created_at ASC
    `, [restaurantId, reportDate]);

    // Calculer les totaux
    const cashTotal = orders
      .filter(order => order.payment_method === 'cash')
      .reduce((sum, order) => sum + order.total_price, 0);

    const electronicTotal = orders
      .filter(order => order.payment_method === 'electronic')
      .reduce((sum, order) => sum + order.total_price, 0);

    // Créer le PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${reportDate}-${restaurant[0].name.replace(/\s+/g, '-')}.pdf"`);

    doc.pipe(res);

    // En-tête du PDF
    doc.fontSize(20)
       .fillColor('#0088cc')
       .text('🍽️ Restaurant Pro', 50, 50);

    doc.fontSize(16)
       .fillColor('#000000')
       .text(`Rapport Journalier - ${restaurant[0].name}`, 50, 80);

    doc.fontSize(12)
       .text(`Date: ${new Date(reportDate).toLocaleDateString('fr-FR', { 
         weekday: 'long', 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric' 
       })}`, 50, 105)
       .text(`Lieu: ${restaurant[0].location}`, 50, 120)
       .text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 50, 135);

    // Ligne de séparation
    doc.strokeColor('#cccccc')
       .lineWidth(1)
       .moveTo(50, 160)
       .lineTo(545, 160)
       .stroke();

    let yPosition = 180;

    if (orders.length === 0) {
      doc.fontSize(14)
         .fillColor('#666666')
         .text('Aucune commande pour cette date', 50, yPosition);
    } else {
      // En-têtes du tableau
      doc.fontSize(10)
         .fillColor('#333333')
         .text('Heure', 50, yPosition)
         .text('Commande', 100, yPosition)
         .text('Produit', 170, yPosition)
         .text('Type', 270, yPosition)
         .text('Prix Unit.', 320, yPosition)
         .text('Qté', 380, yPosition)
         .text('Total', 410, yPosition)
         .text('Paiement', 460, yPosition);

      yPosition += 20;

      // Ligne sous les en-têtes
      doc.strokeColor('#cccccc')
         .lineWidth(0.5)
         .moveTo(50, yPosition - 5)
         .lineTo(545, yPosition - 5)
         .stroke();

      // Données du tableau
      orders.forEach((order, index) => {
        if (yPosition > 750) {
          doc.addPage();
          yPosition = 50;
        }

        const time = new Date(order.created_at).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        doc.fontSize(9)
           .fillColor('#000000')
           .text(time, 50, yPosition)
           .text(order.order_number, 100, yPosition)
           .text(order.product_name.substring(0, 20), 170, yPosition)
           .text(order.product_type === 'dish' ? 'Plat' : 'Boisson', 270, yPosition)
           .text(`${order.unit_price.toLocaleString()} F`, 320, yPosition)
           .text(order.quantity.toString(), 380, yPosition)
           .text(`${order.total_price.toLocaleString()} F`, 410, yPosition)
           .text(order.payment_method === 'cash' ? 'Espèces' : 'Électronique', 460, yPosition);

        yPosition += 15;

        // Ligne séparatrice légère tous les 5 éléments
        if ((index + 1) % 5 === 0) {
          doc.strokeColor('#eeeeee')
             .lineWidth(0.3)
             .moveTo(50, yPosition)
             .lineTo(545, yPosition)
             .stroke();
          yPosition += 5;
        }
      });
    }

    // Section des totaux
    yPosition += 30;
    
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    // Ligne de séparation avant les totaux
    doc.strokeColor('#0088cc')
       .lineWidth(2)
       .moveTo(50, yPosition)
       .lineTo(545, yPosition)
       .stroke();

    yPosition += 20;

    // Totaux
    doc.fontSize(14)
       .fillColor('#0088cc')
       .text('📊 RÉSUMÉ FINANCIER', 50, yPosition);

    yPosition += 25;

    doc.fontSize(12)
       .fillColor('#000000')
       .text(`Total Espèces:`, 50, yPosition)
       .fillColor('#16a085')
       .text(`${cashTotal.toLocaleString()} FCFA`, 200, yPosition);

    yPosition += 20;

    doc.fillColor('#000000')
       .text(`Total Électronique:`, 50, yPosition)
       .fillColor('#3498db')
       .text(`${electronicTotal.toLocaleString()} FCFA`, 200, yPosition);

    yPosition += 25;

    // Total général encadré
    doc.rect(45, yPosition - 5, 200, 25)
       .fillAndStroke('#f8f9fa', '#0088cc');

    doc.fontSize(14)
       .fillColor('#0088cc')
       .text(`💰 TOTAL GÉNÉRAL:`, 50, yPosition)
       .fillColor('#e74c3c')
       .font('Helvetica-Bold')
       .text(`${(cashTotal + electronicTotal).toLocaleString()} FCFA`, 200, yPosition);

    // Pied de page
    doc.fontSize(8)
       .fillColor('#666666')
       .text('Restaurant Pro - Système de gestion futuriste', 50, 770)
       .text(`Page générée automatiquement le ${new Date().toLocaleString('fr-FR')}`, 350, 770);

    doc.end();

  } catch (error) {
    console.error('Erreur export PDF:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export PDF' });
  }
});

// Rapport consolidé pour propriétaires
router.get('/consolidated/:ownerId', authenticateToken, async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { date } = req.query;
    const user = (req as AuthRequest).user;

    // Seuls les propriétaires peuvent accéder aux rapports consolidés
    if (user.role !== 'owner' || user.id !== parseInt(ownerId)) {
      return res.status(403).json({ error: 'Accès propriétaire requis' });
    }

    const reportDate = (date as string) || new Date().toISOString().split('T')[0];

    // Rapport consolidé par restaurant
    const consolidatedReport = await executeQuery(`
      SELECT r.id, r.name, r.location,
             COUNT(DISTINCT o.id) as total_orders,
             SUM(o.total_amount) as total_revenue,
             SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END) as cash_revenue,
             SUM(CASE WHEN o.payment_method = 'electronic' THEN o.total_amount ELSE 0 END) as electronic_revenue,
             AVG(o.total_amount) as average_order_value
      FROM restaurants r
      LEFT JOIN orders o ON r.id = o.restaurant_id AND DATE(o.created_at) = ?
      WHERE r.owner_id = ?
      GROUP BY r.id, r.name, r.location
      ORDER BY total_revenue DESC
    `, [reportDate, ownerId]);

    // Totaux globaux
    const globalTotals = consolidatedReport.reduce((acc, restaurant) => ({
      total_orders: acc.total_orders + (restaurant.total_orders || 0),
      total_revenue: acc.total_revenue + (restaurant.total_revenue || 0),
      cash_revenue: acc.cash_revenue + (restaurant.cash_revenue || 0),
      electronic_revenue: acc.electronic_revenue + (restaurant.electronic_revenue || 0)
    }), { total_orders: 0, total_revenue: 0, cash_revenue: 0, electronic_revenue: 0 });

    res.json({
      date: reportDate,
      owner_id: parseInt(ownerId),
      restaurants: consolidatedReport,
      global_totals: globalTotals
    });

  } catch (error) {
    console.error('Erreur rapport consolidé:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du rapport consolidé' });
  }
});

export default router;
